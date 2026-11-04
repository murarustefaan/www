import { socialLinks } from "@/data/social";
import { siteConfig } from "@/site.config";

export const personId = `${siteConfig.url}#person`;

export const personRef = {
	"@type": "Person",
	"@id": personId,
	name: siteConfig.author,
	url: siteConfig.url,
};

export const homeKnowsAbout = [
	"Kubernetes",
	"Go",
	"TypeScript",
	"Terraform",
	"Cloud Infrastructure",
	"Platform Engineering",
	"Observability",
	"Docker",
	"AWS",
	"Google Cloud Platform",
];

export const resumeKnowsAbout = [
	...homeKnowsAbout,
	"Node.js",
	"GraphQL",
	"OAuth 2.0",
	"OpenID Connect",
	"Argo CD",
	"Helm",
	"Kustomize",
	"GitHub Actions",
	"CI/CD",
	"Kubernetes Operators",
	"RabbitMQ",
	"Prometheus",
	"Grafana",
	"Loki",
	"Elasticsearch",
	"MongoDB",
	"PostgreSQL",
	"Redis",
	"Cloudflare",
];

export function person(knowsAbout: string[] = homeKnowsAbout) {
	return {
		...personRef,
		image: `${siteConfig.url}me.jpg`,
		jobTitle: "Team Lead",
		description: "Engineering team lead at env zero.",
		worksFor: {
			"@type": "Organization",
			name: "env zero",
			alternateName: "env0",
			url: "https://www.envzero.com",
		},
		sameAs: socialLinks.filter(({ href }) => href.startsWith("http")).map(({ href }) => href),
		knowsAbout,
	};
}

export function profilePage(url: string, knowsAbout?: string[]) {
	return {
		"@context": "https://schema.org",
		"@type": "ProfilePage",
		url,
		mainEntity: person(knowsAbout),
	};
}
