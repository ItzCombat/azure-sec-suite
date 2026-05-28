import * as dotenv from "dotenv";
dotenv.config();

function require_env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  targetUrl: require_env("TARGET_URL"),

  azure: {
    tenantId:     process.env.AZURE_TENANT_ID     ?? "",
    clientId:     process.env.AZURE_CLIENT_ID     ?? "",
    clientSecret: process.env.AZURE_CLIENT_SECRET ?? "",
    scope:        process.env.AZURE_SCOPE         ?? "",
  },

  zap: {
    apiKey: process.env.ZAP_API_KEY ?? "",
    port:   Number(process.env.ZAP_PORT ?? 8090),
  },
};
