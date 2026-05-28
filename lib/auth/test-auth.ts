import { ConfidentialClientApplication, LogLevel } from "@azure/msal-node";
import axios from "axios";
import { config } from "../config.ts";

async function acquireToken(): Promise<string> {
  const { tenantId, clientId, clientSecret, scope } = config.azure;
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in .env");
  }

  const msal = new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
    system: { loggerOptions: { logLevel: LogLevel.Warning, piiLoggingEnabled: false, loggerCallback: () => {} } },
  });

  const result = await msal.acquireTokenByClientCredential({ scopes: [scope] });
  if (!result?.accessToken) throw new Error("Token acquisition returned no access token");
  return result.accessToken;
}

async function runAuthTests(): Promise<void> {
  console.log("[AUTH] Acquiring token via client credentials flow...");
  const token = await acquireToken();
  console.log("[AUTH] Token acquired successfully");

  // Test 1 — authenticated request
  console.log("\n[AUTH] Test 1: Authenticated request");
  const authRes = await axios.get(config.targetUrl, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });
  console.log(`  Status: ${authRes.status}`);

  // Test 2 — unauthenticated request (should be rejected)
  console.log("\n[AUTH] Test 2: Unauthenticated request (expect 401/403)");
  const unauthRes = await axios.get(config.targetUrl, { validateStatus: () => true });
  const unauthPassed = unauthRes.status === 401 || unauthRes.status === 403;
  console.log(`  Status: ${unauthRes.status} — ${unauthPassed ? "PASS" : "FAIL (endpoint is publicly accessible!)"}`);

  // Test 3 — tampered token (should be rejected)
  console.log("\n[AUTH] Test 3: Tampered token (expect 401)");
  const tampered = token.slice(0, -10) + "AAAAAAAAAA";
  const tamperedRes = await axios.get(config.targetUrl, {
    headers: { Authorization: `Bearer ${tampered}` },
    validateStatus: () => true,
  });
  const tamperedPassed = tamperedRes.status === 401;
  console.log(`  Status: ${tamperedRes.status} — ${tamperedPassed ? "PASS" : "FAIL (tampered token was accepted!)"}`);

  console.log("\n[AUTH] Done.");
}

runAuthTests().catch((err) => {
  console.error("[AUTH] Fatal:", err.message);
  process.exit(1);
});
