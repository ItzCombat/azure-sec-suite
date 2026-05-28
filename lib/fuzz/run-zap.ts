import axios from "axios";
import { config } from "../config";

const ZAP = `http://localhost:${config.zap.port}`;
const KEY = config.zap.apiKey;

async function zapGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${ZAP}${path}`);
  url.searchParams.set("apikey", KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await axios.get(url.toString());
  return res.data;
}

async function runActiveScan(target: string): Promise<void> {
  console.log(`[ZAP] Starting active scan against ${target}`);

  // Spider first
  const spiderRes = await zapGet("/JSON/spider/action/scan/", { url: target });
  const spiderId: string = spiderRes.scan;
  console.log(`[ZAP] Spider ID: ${spiderId}`);

  // Poll until spider done
  let spiderProgress = 0;
  while (spiderProgress < 100) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await zapGet("/JSON/spider/view/status/", { scanId: spiderId });
    spiderProgress = Number(status.status);
    process.stdout.write(`\r[ZAP] Spider: ${spiderProgress}%`);
  }
  console.log("\n[ZAP] Spider complete");

  // Active scan
  const scanRes = await zapGet("/JSON/ascan/action/scan/", { url: target });
  const scanId: string = scanRes.scan;
  let progress = 0;
  while (progress < 100) {
    await new Promise((r) => setTimeout(r, 5000));
    const status = await zapGet("/JSON/ascan/view/status/", { scanId });
    progress = Number(status.status);
    process.stdout.write(`\r[ZAP] Active scan: ${progress}%`);
  }
  console.log("\n[ZAP] Active scan complete");

  // Fetch alerts
  const alerts = await zapGet("/JSON/alert/view/alerts/", { baseurl: target });
  const high   = alerts.alerts.filter((a: { risk: string }) => a.risk === "High");
  const medium = alerts.alerts.filter((a: { risk: string }) => a.risk === "Medium");
  console.log(`[ZAP] Findings — High: ${high.length}  Medium: ${medium.length}  Total: ${alerts.alerts.length}`);

  const fs = await import("fs");
  fs.writeFileSync("reports/zap-alerts.json", JSON.stringify(alerts.alerts, null, 2));
  console.log("[ZAP] Full report saved to reports/zap-alerts.json");
}

runActiveScan(config.targetUrl).catch((err) => {
  console.error("[ZAP] Error:", err.message);
  console.error("Make sure OWASP ZAP is running: zaproxy -daemon -port 8090 -config api.key=<your-key>");
  process.exit(1);
});
