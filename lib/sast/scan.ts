import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS = path.resolve(__dirname, "../../reports");

function run(label: string, cmd: string, outFile?: string): string {
  console.log(`\n[SAST] Running: ${label}`);
  let output = "";
  try {
    output = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    output = error.stdout ?? error.message ?? String(err);
  }
  if (outFile) {
    fs.writeFileSync(path.join(REPORTS, outFile), output);
  }
  return output;
}

// npm audit
const auditRaw = run("npm audit", "npm audit --json", "npm-audit.json");
try {
  const audit = JSON.parse(auditRaw);
  const vulns = audit.vulnerabilities ?? {};
  const counts: Record<string, number> = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
  for (const v of Object.values(vulns) as Array<{ severity: string }>) {
    counts[v.severity] = (counts[v.severity] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    console.log("[npm audit] ✓ No vulnerabilities found");
  } else {
    console.log(`[npm audit] Found ${total} vulnerabilities:`);
    if (counts.critical) console.log(`  🔴 Critical : ${counts.critical}`);
    if (counts.high)     console.log(`  🟠 High     : ${counts.high}`);
    if (counts.moderate) console.log(`  🟡 Moderate : ${counts.moderate}`);
    if (counts.low)      console.log(`  🔵 Low      : ${counts.low}`);
    console.log("\n  Top issues:");
    let shown = 0;
    for (const [name, v] of Object.entries(vulns) as Array<[string, { severity: string; via: unknown[] }]>) {
      if (shown >= 5) break;
      const via = Array.isArray(v.via) && typeof v.via[0] === "object"
        ? (v.via[0] as { title?: string }).title ?? ""
        : "";
      console.log(`  - ${name} (${v.severity})${via ? `: ${via}` : ""}`);
      shown++;
    }
    if (total > 5) console.log(`  ... and ${total - 5} more. Full report: reports/npm-audit.json`);
  }
} catch {
  console.log("[npm audit] Could not parse output — check reports/npm-audit.json");
}

// Trivy filesystem scan
console.log("\n[SAST] Running: Trivy filesystem scan");
try {
  const trivyRaw = execSync(
    `trivy fs --format json .`,
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], cwd: path.resolve(__dirname, "../..") }
  );
  fs.writeFileSync(path.join(REPORTS, "trivy-fs.json"), trivyRaw);
  const trivy = JSON.parse(trivyRaw);
  const results: Array<{ Vulnerabilities?: Array<{ Severity: string; VulnerabilityID: string; PkgName: string; Title?: string }> }> = trivy.Results ?? [];
  const all = results.flatMap(r => r.Vulnerabilities ?? []);
  if (all.length === 0) {
    console.log("[Trivy] ✓ No vulnerabilities found");
  } else {
    const bySev: Record<string, number> = {};
    for (const v of all) bySev[v.Severity] = (bySev[v.Severity] ?? 0) + 1;
    console.log(`[Trivy] Found ${all.length} vulnerabilities:`);
    for (const [sev, count] of Object.entries(bySev)) console.log(`  ${sev}: ${count}`);
    console.log("\n  Top issues:");
    all.slice(0, 5).forEach(v => console.log(`  - ${v.PkgName} ${v.VulnerabilityID} (${v.Severity})${v.Title ? `: ${v.Title}` : ""}`));
    if (all.length > 5) console.log(`  ... and ${all.length - 5} more. Full report: reports/trivy-fs.json`);
  }
} catch (err: unknown) {
  const msg = (err as { message?: string }).message ?? String(err);
  if (msg.includes("ENOENT") || msg.includes("not found")) {
    console.log("[Trivy] Not installed — skipping. Install from https://trivy.dev");
  } else {
    console.log(`[Trivy] Error: ${msg}`);
  }
}

// Trivy secret scan
console.log("\n[SAST] Running: Trivy secret scan");
try {
  const secretRaw = execSync(
    `trivy fs --scanners secret --format json .`,
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], cwd: path.resolve(__dirname, "../..") }
  );
  fs.writeFileSync(path.join(REPORTS, "trivy-secrets.json"), secretRaw);
  const parsed = JSON.parse(secretRaw);
  const secrets = (parsed.Results ?? []).flatMap((r: { Secrets?: unknown[] }) => r.Secrets ?? []);
  if (secrets.length === 0) {
    console.log("[Trivy secrets] ✓ No secrets detected");
  } else {
    console.log(`[Trivy secrets] ⚠ Found ${secrets.length} exposed secret(s) — rotate these credentials immediately!`);
    secrets.slice(0, 5).forEach((s: unknown) => {
      const secret = s as { RuleID?: string; Title?: string; Target?: string };
      console.log(`  - ${secret.RuleID ?? secret.Title ?? "secret"} in ${secret.Target ?? "unknown file"}`);
    });
  }
} catch (err: unknown) {
  const msg = (err as { message?: string }).message ?? String(err);
  if (msg.includes("ENOENT") || msg.includes("not found")) {
    console.log("[Trivy secrets] Not installed — skipping.");
  } else {
    console.log(`[Trivy secrets] Error: ${msg}`);
  }
}

console.log("\n[SAST] Scan complete.");
