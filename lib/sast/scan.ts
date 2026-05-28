import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const REPORTS = path.resolve(__dirname, "../../reports");

function run(label: string, cmd: string, outFile?: string): void {
  console.log(`\n[SAST] Running: ${label}`);
  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    if (outFile) {
      fs.writeFileSync(path.join(REPORTS, outFile), output);
      console.log(`[SAST] Report saved → reports/${outFile}`);
    } else {
      console.log(output);
    }
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    const out = error.stdout ?? error.message ?? String(err);
    if (outFile) {
      fs.writeFileSync(path.join(REPORTS, outFile), out);
      console.log(`[SAST] Report saved → reports/${outFile} (with findings)`);
    } else {
      console.log(out);
    }
  }
}

// npm dependency audit
run("npm audit", "npm audit --json", "npm-audit.json");

// Trivy filesystem scan (requires trivy installed: https://trivy.dev)
run(
  "Trivy filesystem scan",
  `trivy fs --format json --output reports/trivy-fs.json .`,
);

// Trivy secret detection
run(
  "Trivy secret scan",
  `trivy fs --scanners secret --format json --output reports/trivy-secrets.json .`,
);

console.log("\n[SAST] All scans complete. Check the reports/ folder.");
