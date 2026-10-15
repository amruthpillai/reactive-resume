/** Normalize deployment-provided aliases without overriding explicit settings. */
export function deploymentEnvironment(input: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
	const value = (key: string) => input[key]?.trim() || undefined;
	const vercel = value("VERCEL") === "1";
	const cloudflare = value("CLOUDFLARE") === "1";
	const hostname =
		value("VERCEL_ENV") === "production"
			? (value("VERCEL_PROJECT_PRODUCTION_URL") ?? value("VERCEL_URL"))
			: value("VERCEL_URL");
	const appUrl = value("APP_URL") ?? (vercel && hostname ? `https://${hostname}` : undefined);
	const hasS3 = value("S3_ACCESS_KEY_ID") && value("S3_SECRET_ACCESS_KEY") && value("S3_BUCKET");
	// Cloudron addons supply their own variable names: https://docs.cloudron.io/packaging/addons
	const mailFrom = value("CLOUDRON_MAIL_FROM");
	const cloudron: Record<string, string | undefined> =
		value("CLOUDRON") === "1"
			? {
					APP_URL: value("CLOUDRON_APP_ORIGIN"),
					DATABASE_URL: value("CLOUDRON_POSTGRESQL_URL"),
					REDIS_URL: value("CLOUDRON_REDIS_URL"),
					TRUSTED_PROXIES: value("CLOUDRON_PROXY_IP"),
					SMTP_HOST: value("CLOUDRON_MAIL_SMTP_SERVER"),
					SMTP_PORT: value("CLOUDRON_MAIL_SMTP_PORT"),
					SMTP_USER: value("CLOUDRON_MAIL_SMTP_USERNAME"),
					SMTP_PASS: value("CLOUDRON_MAIL_SMTP_PASSWORD"),
					SMTP_FROM: mailFrom && `${value("CLOUDRON_MAIL_FROM_DISPLAY_NAME") ?? "Reactive Resume"} <${mailFrom}>`,
					OAUTH_PROVIDER_NAME: value("CLOUDRON_OIDC_PROVIDER_NAME"),
					OAUTH_CLIENT_ID: value("CLOUDRON_OIDC_CLIENT_ID"),
					OAUTH_CLIENT_SECRET: value("CLOUDRON_OIDC_CLIENT_SECRET"),
					OAUTH_DISCOVERY_URL: value("CLOUDRON_OIDC_DISCOVERY_URL"),
				}
			: {};
	return {
		...input,
		APP_URL: appUrl,
		// Hyperdrive's actual URL is supplied to the request-scoped pool, never shared across requests.
		DATABASE_URL:
			value("DATABASE_URL") ?? (cloudflare ? "postgresql://hyperdrive" : vercel ? value("POSTGRES_URL") : undefined),
		DATABASE_MIGRATION_URL:
			value("DATABASE_MIGRATION_URL") ??
			(vercel ? (value("DATABASE_URL_UNPOOLED") ?? value("POSTGRES_URL_NON_POOLING")) : undefined),
		REDIS_URL: value("REDIS_URL") ?? (vercel ? value("KV_URL") : undefined),
		STORAGE_BACKEND: value("STORAGE_BACKEND") ?? (cloudflare ? "r2" : hasS3 ? "s3" : vercel ? "blob" : "local"),
		DEPLOYMENT_NAMESPACE:
			value("DEPLOYMENT_NAMESPACE") ??
			(vercel
				? value("VERCEL_ENV") === "preview"
					? (value("VERCEL_BRANCH_URL") ?? hostname ?? "preview")
					: "production"
				: "default"),
		...Object.fromEntries(Object.entries(cloudron).map(([key, alias]) => [key, value(key) ?? alias])),
	};
}
