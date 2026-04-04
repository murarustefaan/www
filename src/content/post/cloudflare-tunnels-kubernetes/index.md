---
title: "Zero-Port Setup: Cloudflare Tunnels on Kubernetes"
description: "Running Cloudflare Tunnels as a Kubernetes DaemonSet with health probes, secrets management, and no exposed ports. Production setup and configuration."
publishDate: "27 Oct 2025"
tags: ["kubernetes", "cloudflare", "security", "infrastructure"]
draft: false
---

I used to expose services to the internet the traditional way: open port 443 on my router, forward it to a LoadBalancer service of an ingress controller, maybe add some fail2ban rules, and hope nothing breaks through. Every time I added a new service, I'd think about the attack surface I was expanding -- SSH brute force attempts, random exploit scanners, the constant noise in the logs.

Then I moved everything behind Cloudflare Tunnels, and my router hasn't had an open inbound port in over two years.

But here's the thing: most Cloudflare Tunnel tutorials show you how to run `cloudflared` as a Docker container or a systemd service on a VM. That works fine until you need reliability, proper health monitoring, secrets rotation, or you're already running Kubernetes and don't want to manage yet another deployment method.

I run Cloudflare Tunnels as a Kubernetes DaemonSet in my homelab cluster. It's been rock solid, automatically recovers from failures, and integrates cleanly with the rest of my infrastructure. Here's why this approach works better than traditional deployments, and how to set it up yourself.

## What Are Cloudflare Tunnels (The 30-Second Version)

Cloudflare Tunnels create an outbound-only connection from your infrastructure to Cloudflare's edge network. Instead of exposing ports to the internet and hoping your firewall rules are right, your services initiate persistent connections to Cloudflare. When someone hits your domain, Cloudflare routes the request through the tunnel to your service.

The security win is simple: no inbound ports, no port forwarding, no direct exposure to the internet. Attackers can't scan for your IP and probe for vulnerabilities because there's nothing listening. All they see is Cloudflare.

You configure which hostnames route to which internal services (like `blog.example.com` → `http://my-blog-service:3000`), and Cloudflare handles the rest—SSL termination, DDoS protection, caching, the works.

## Why Kubernetes Over VMs and Docker Compose

I started with `cloudflared` running in a Docker container managed by `docker-compose`. It worked, but configuration updates meant SSH-ing into the host, editing the compose file, and restarting the container. Host reboots were a coin flip on whether the tunnel would come back up cleanly. Health checking was limited to "is the container running?"

Next attempt was a systemd service on a VM. More reliable, but now I had a VM to maintain, OS updates to handle, and still minimal visibility into whether the tunnel was actually healthy beyond tailing logs.

Kubernetes gave me what I actually needed:

**Health probes that matter**: The `cloudflared` daemon exposes a `/metrics` endpoint. Kubernetes liveness probes hit it every few seconds. If it stops responding, the pod restarts. This catches cases where the process is running but the connection to Cloudflare is dead.

**Secrets management**: The tunnel token lives in a Kubernetes Secret instead of a config file or compose environment variable. This works with whatever secrets system you're using—Sealed Secrets, External Secrets Operator, or just etcd encryption at rest.

**Declarative configuration**: I run GitOps with ArgoCD. The Cloudflare Tunnel manifests live in the same repository as everything else. Configuration changes are tracked in Git, reviewed in PRs, and deployed automatically. No manual changes on individual hosts.

**Automatic recovery**: If a pod crashes or a node goes down, Kubernetes restarts the pod or reschedules it. I'm using a DaemonSet (one tunnel pod per node), which means if I have three nodes, I get three tunnels automatically. A classic Deployment would work too -- you'd just specify replica count manually -- but for this use case, DaemonSet is cleaner since I want tunnel presence to scale with cluster size without thinking about it.

**Resource limits and metrics**: I set CPU and memory limits on the pods, and Prometheus scrapes the metrics endpoint. I can see traffic volume, connection counts, and tunnel health in Grafana alongside the rest of my infrastructure.

The operational benefit is straightforward: I don't manage the tunnels anymore. Add a node to the cluster, the tunnel starts automatically. Drain a node for maintenance, traffic routes through the remaining tunnels. It's infrastructure that stays out of the way.

## The DaemonSet Configuration

Here's the actual manifest I'm running in production. It's simple, but every piece is there for a reason.

```yaml
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cloudflared
spec:
  selector:
    matchLabels:
      app: cloudflared
  template:
    metadata:
      labels:
        app: cloudflared
    spec:
      containers:
        - name: cloudflared
          image: cloudflare/cloudflared:latest
          args:
            - tunnel
            - --no-autoupdate
            - --metrics
            - 0.0.0.0:60123
            - run
            - --token
            - $(CLOUDFLARE_TOKEN)
          livenessProbe:
            httpGet:
              path: /metrics
              port: metrics
            failureThreshold: 3
            initialDelaySeconds: 5
            periodSeconds: 5
          ports:
            - containerPort: 60123
              name: metrics
          env:
            - name: CLOUDFLARE_TOKEN
              valueFrom:
                secretKeyRef:
                  name: cloudflared-credentials
                  key: token
      volumes:
        - name: cloudflared-credentials
          secret:
            secretName: cloudflared-credentials
            items:
              - key: token
                path: token
```

Let me break down the key parts:

**DaemonSet vs Deployment**: A DaemonSet runs one pod on every node in the cluster. For tunnels, this gives you redundancy without having to think about replica counts or scheduling. If you have three nodes, you get three tunnels automatically. Cloudflare's infrastructure handles load balancing across the tunnels, so you get both high availability and failover for free.

**The `--no-autoupdate` flag**: Kubernetes manages the container image version, so I don't want `cloudflared` trying to update itself. This keeps updates explicit and controlled through my GitOps workflow.

**The `--metrics` flag**: This exposes a metrics endpoint on port 60123 that returns stats about tunnel health, active connections, and data transfer. Kubernetes uses this for health checks, and I scrape it with Prometheus for monitoring.

**Liveness probe**: Every 5 seconds, Kubernetes makes an HTTP request to `/metrics`. If three checks in a row fail, the pod gets restarted. This catches cases where the tunnel process is running but the connection to Cloudflare is broken. The `initialDelaySeconds: 5` gives the tunnel time to establish its connection before health checks start.

**Secret management**: The tunnel token comes from a Kubernetes Secret, not hardcoded in the manifest. When you create a tunnel in the Cloudflare dashboard, you get a token that authorizes the tunnel to connect. That token goes in the Secret, and the pod reads it at runtime.

The Secret manifest is straightforward:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloudflared-credentials
  labels:
    app: cloudflared
type: Opaque
stringData:
  token: "your-tunnel-token-here"
```

In practice, I don't commit the actual token to Git. I use the External Secrets Operator to pull it from a vault. Albeit I can't in good conscience recommend it, on a homelab, even just creating the Secret manually with `kubectl create secret` might be just fine -- just keep the token out of version control.

## Setup Instructions

Here's how to get this running yourself:

**1. Create a Cloudflare Tunnel**

Log into the Cloudflare dashboard, go to Zero Trust → Access → Tunnels, and create a new tunnel. Give it a name like "homelab-k8s". Cloudflare will generate a token -- save this, you'll need it in a moment.

**2. Configure your routes**

Still in the Cloudflare dashboard, add public hostnames for your services. For example:
- `blog.yourdomain.com` → `http://blog-service.apps.svc.cluster.local:3000`
- `api.yourdomain.com` → `http://api-service.apps.svc.cluster.local:8080`

You're mapping external hostnames to internal Kubernetes service names. The tunnels will route traffic to these services via the cluster DNS.

**3. Create the Secret in Kubernetes**

```bash
kubectl create secret generic cloudflared-credentials \
  --from-literal=token="your-tunnel-token-here" \
  --namespace=infrastructure
```

Replace `your-tunnel-token-here` with the token from step 1. I keep my tunnels in an `infrastructure` namespace, but use whatever fits your cluster organization.

**4. Apply the DaemonSet manifest**

Save the manifest above to a file (or clone it from my [homeops repo](https://github.com/murarustefaan/homeops/tree/main/cloudflared)) and apply it:

```bash
kubectl apply -f cloudflared-daemonset.yaml --namespace=infrastructure
```

**5. Verify it's working**

Check that the pods are running:

```bash
kubectl get pods -n infrastructure -l app=cloudflared
```

You should see one pod per node, all in the `Running` state. Check the logs to confirm the tunnel connected:

```bash
kubectl logs -n infrastructure -l app=cloudflared --tail=20
```

You should see logs indicating the tunnel registered and is serving routes. Hit one of your configured hostnames in a browser -- if it loads, you're done.

## Key Benefits Recap

After running this setup for the past year, here's what I appreciate most:

**Zero open ports on my network**: My router has no inbound port forwarding rules. The only outbound connection is from the tunnel to Cloudflare. Attackers can't even see my home IP -- all they see is Cloudflare's edge.

**Automatic failover**: If a node goes down or a pod crashes, Kubernetes restarts it or traffic flows through the tunnels on other nodes. I've never had an outage due to tunnel issues.

**Clean integration with GitOps**: The tunnel config lives in the same Git repo as the rest of my infrastructure. Changes go through pull requests and get deployed automatically by ArgoCD. No manual SSH sessions, no config drift.

**Proper monitoring**: The metrics endpoint gets scraped by Prometheus, so I can see tunnel health, connection counts, and data transfer in Grafana alongside everything else. I set up alerts for when tunnels go down or traffic patterns look unusual.

**Secrets handled correctly**: The tunnel token is managed as a Kubernetes Secret, not sitting in a config file on a VM or in a Docker Compose file. It can be rotated without redeploying the entire stack.

If you're already running Kubernetes and you want to expose services to the internet without punching holes in your firewall, this setup is hard to beat. It's simpler than setting up and maintaining a reverse proxy with Let's Encrypt, more secure than forwarding ports directly, and more reliable than running tunnels on individual VMs or containers.

The full configuration lives in my [homeops repository](https://github.com/murarustefaan/homeops/tree/main/cloudflared) if you want to see it in context with the rest of my cluster setup. 

---

*As always, if you have thoughts on the architecture or want to discuss the technical choices, feel free to reach out on [LinkedIn](https://www.linkedin.com/in/murarustefan/) or drop me an [email](mailto:hello@stefanmuraru.com)*.
