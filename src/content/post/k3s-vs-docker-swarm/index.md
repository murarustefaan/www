---
title: "I Almost Ditched k3s for Docker Swarm (And Why I Didn't)"
description: "After two years of k8s complexity, I seriously evaluated switching to Docker Swarm. Here's what I learned about the trade-offs and why I ultimately stayed."
publishDate: "26 Oct 2025"
tags: ["kubernetes", "docker", "homelab", "infrastructure"]
draft: false
---

After two years of running k3s-backed Kubernetes in my homelab, I'd almost had enough. The constant YAML wrangling, the endless tweaking of networking configs, the storage drivers, the CNI plugins—it all felt like overkill for what I was running: a few microservices, my blog, some databases, and monitoring tools spread across three nodes.

Docker Swarm kept whispering in my ear: "Remember how simple I was? Just `docker stack deploy` and you're done."

I'd used Swarm before. I knew it worked. I knew it was lighter. And after yet another evening spent debugging why ArgoCD wasn't syncing properly, I decided to seriously evaluate switching back.

Spoiler: I'm still on k3s. Here's why.

Before you dismiss this as another "k8s is too complex" rant from someone who hasn't used it properly: I've spent the last 8 years running production Kubernetes clusters. I've done kubeadm installations from scratch. I've managed multi-region, multi-AZ clusters across GCP and AWS handling real traffic and real money. I know Kubernetes. Which is exactly why my frustration with my homelab setup was so significant—if someone with my background was struggling to justify the complexity, something was off.

## The Frustration That Started It All

Let me be clear about what was driving me crazy. It wasn't one specific thing—it was the accumulated complexity of keeping everything aligned.

I run a hybrid (maybe even a little unorthodox) setup at home: a Mac Studio with Ubuntu Asahi, an Intel NUC, and an actual server, the latter two virtualized through Proxmox. It's a 3-node cluster hosting:
- My personal blog -- [murarustefaan/www](https://github.com/murarustefaan/www)
- A couple of gRPC and HTTP microservices for some side projects
- Message queues (redundant RabbitMQ broker)
- Databases (PostgreSQL and ClickHouse, both deployed via operators with backups and redundancy)
- Prometheus for monitoring
- ArgoCD for continuous deployment

Every time I needed to make a change, apply an update, deploy a new service, troubleshoot networking -- I'd spend 30 minutes to an hour just making sure everything was properly configured. Ingress rules, the service mesh, certificates, resource limits, RBAC policies -— the list goes on.

After two years, I was tired. I'd brought all the production-grade patterns I knew—operators, service meshes, GitOps—into my homelab, and was starting to question whether I'd over-engineered it. The complexity that made sense for production clusters felt increasingly absurd for a three-node homelab.

## Why Docker Swarm Looked So Appealing

Docker Swarm promised simplicity. And for good reason:

**Lower resource footprint**: Swarm mode is built into Docker. No additional control plane components eating up memory. On my already-resource-constrained nodes, this mattered.

**Immediate familiarity**: I knew Docker Compose. Swarm stacks are basically Compose files with some extra fields. No mental overhead of mapping concepts through Deployments, StatefulSets, and PersistentVolumeClaims when all I needed was "run this container on these nodes."

**Things just work out of the box**: Networking? Built-in overlay networks, no CNI plugins to choose and configure. Storage? Mount a volume, done. No CSI drivers, no StorageClasses. Load balancing? Swarm handles it automatically.

I'd used Swarm in production before the k8s takeover—back when it was still a viable alternative. I remembered the experience being straightforward, though admittedly for simpler workloads than what I run in k8s now. `docker stack deploy -c stack.yml myapp` and you were live. Updates? Same command. Rollback? `docker service rollback`. Clean and simple.

## The Reality Check: Setting Up the POC

I carved out a weekend to give Swarm a fair shot. I spun up a small-size 3-node Swarm cluster in a separate environment and started migrating my workloads.

The basics came together quickly. My simple web services deployed without a hitch. The networking worked immediately—no ingress controllers to configure, no certificate management headaches. I got my blog running in under an hour.

Then I hit the real-world scenarios.

### The Operator Problem

PostgreSQL and ClickHouse in my k8s cluster run via operators (CloudNativePG and the ClickHouse Operator). After years of managing databases in production k8s, I'm not going back to manual operations—these operators handle backups, failover, upgrades, and monitoring with patterns I trust from production environments.

Swarm has no equivalent to Kubernetes operators. I'd have to:
1. Deploy raw PostgreSQL and ClickHouse containers
2. Manually configure replication and backups
3. Write custom scripts for failover
4. Handle upgrades by hand

Doable? Sure. But this immediately added back complexity I was trying to escape.

### The Monitoring Gap

In k8s, I run Cilium as my CNI. Beyond basic networking, Cilium gives me request-level observability through Hubble —- I can see service-to-service traffic, identify slow endpoints, debug network policies, all from a unified dashboard. On top of that, it smoothly allows Prometheus to scrape these metrics and allow exploring them in Grafana, where I have built alerts on top of them. 

Swarm's built-in networking offers none of this. I'd need to instrument every application manually, set up sidecar proxies, or give up that visibility entirely.

Prometheus and Grafana would need to be manually wired up. No Prometheus Operator to automatically discover new services and scrape them. Every new service means updating Prometheus config and redeploying.

### The Deployment Workflow

ArgoCD in my k8s cluster watches my container images and automatically deploys changes. I push to main, and within minutes the image gets built and my cluster reflects the new state. It handles secrets, dependencies, health checks, and rollbacks.

Swarm's story here is… lacking. Portainer offers some UI-driven management, but it's nowhere near the declarative GitOps workflow I'd become dependent on. I'd need to build CI/CD pipelines that SSH into nodes and run `docker stack deploy`, or rely on webhook-based solutions that felt fragile.

### The Credentials Nightmare

Kubernetes has robust secrets management with integration points for external systems like HashiCorp Vault, 1Password Connect or sealed-secrets for GitOps workflows, trough the external-secrets operator.

Swarm has Docker secrets. They work, but they're basic. No external integration, no rotation strategies, no fine-grained access control. For a homelab, maybe acceptable. For anything with real data? Concerning.

## The Moment of Clarity

I was three services into my migration when I stepped back and asked myself: "What am I actually gaining here?"

Yes, the initial deployment was simpler. But I was losing:
- Automatic database operations and failover
- Deep observability into my network traffic
- GitOps-driven deployments
- Rich monitoring with auto-discovery
- Battle-tested secrets management
- Access to the vast Kubernetes ecosystem

And the biggest realization: **Swarm isn't evolving**.

Looking at Docker's GitHub, Swarm development has essentially stalled. The last major feature was years ago. The community is small and shrinking. Meanwhile, the Kubernetes ecosystem adds new tools, operators, and capabilities constantly.

If I switched to Swarm, I'd be:
1. Solving today's complexity with yesterday's technology
2. Investing time in a platform with a questionable future
3. Limiting my infrastructure's ability to grow with my needs
4. Reducing my skills' transferability (every job wants Kubernetes experience; few care about Swarm)

## What I Did Instead

I didn't switch to Swarm. Instead, I fixed the real problems.

**I simplified my k8s setup**:
- Removed services I wasn't actually using
- Consolidated monitoring into a lighter stack
- Standardized on Helm charts where possible to reduce custom YAML
- Installed [rancher/system-upgrade-controller](https://github.com/rancher/system-upgrade-controller) in order to automatically apply patch upgrades.

**I remembered why I chose k8s in the first place**:
- The complexity solves real problems—even in a homelab with stateful services
- The operational patterns I practice at home are a subset of the ones I use professionally
- The ecosystem maturity means I'm not reinventing solutions to solved problems

## Should You Stick With k8s or Switch to Swarm?

If you're in a similar situation, frustrated with k8s complexity, here's my advice: **Don't switch platforms -- fix the underlying problems.**

Ask yourself:
- **What specific pain points am I trying to solve?** List them. Be specific.
- **Would Swarm actually solve them, or just trade them for different problems?** In my case, Swarm simplified deployment but complicated operations.
- **Am I using features I don't need?** Maybe you don't need a service mesh, or automatic scaling, or complex RBAC. Simplify your k8s setup first.
- **Is my frustration about k8s, or about how I've configured it?** Often it's the latter.

### When Swarm (or Compose, even) Might Make Sense

I'm not saying Swarm is never the answer. It could work if:
- You're running a few simple stateless services or maybe building a small MVP
- You don't need operators or advanced automation
- You're comfortable with limited observability
- You're okay with manual operational tasks
- You want the absolute simplest setup and can live with the trade-offs

But for most modern workloads -- especially if you're running stateful services, need robust monitoring, or want your infrastructure to grow with you -- Kubernetes is worth the complexity.

## The Unexpected Benefit

Here's the twist: evaluating Swarm was one of the most valuable things I did for my k8s setup.

It forced me to articulate exactly what I was getting from k8s. It made me realize which features were critical versus which were just "nice to have." It pushed me to clean up technical debt and simplify my configurations.

Sometimes you need to seriously consider leaving to remember why you stayed.

## The Bottom Line

Kubernetes is complex. But complexity isn't inherently bad—it's bad when it doesn't serve a purpose.

After two years of running homelab-grade Kubernetes on k3s, I almost switched to Docker Swarm because I was drowning in configuration files and maintenance tasks. But when I actually tried to replicate my setup in Swarm, I realized that k8s complexity was buying me:
- Powerful automation through operators
- Rich observability and monitoring
- Modern deployment workflows
- A thriving ecosystem
- Future-proof infrastructure
- Transferable skills

Your mileage may vary. If your needs are simple enough, Swarm might genuinely be the better choice. But if you're running real workloads with operational requirements, stick with k8s and invest in making it work better for you.

The grass isn't always greener. Sometimes you just need better gardening tools.

---

*Running k8s or considering a switch? I'd love to hear about your experience. What pain points are you hitting? What keeps you on Kubernetes (or what made you leave)? Share your thoughts in the comments.*
