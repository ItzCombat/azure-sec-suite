// k6 smoke test — verifies the app is alive under minimal load.
// Run: k6 run lib/load/smoke.js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    // Only threshold on duration — http_req_failed is omitted because backend APIs
    // legitimately return 401/404 on unauthenticated requests, which k6 counts as
    // failures. The custom checks (server is up, no server crash) cover liveness.
    http_req_duration: ["p(95)<2000"],
  },
};

const TARGET = __ENV.TARGET_URL || "https://your-app.azurewebsites.net";

export default function () {
  const res = http.get(TARGET, { redirects: 0 });
  check(res, {
    "server is up":       (r) => r.status > 0,
    "no server crash":    (r) => r.status < 500,
    "response time OK":   (r) => r.timings.duration < 2000,
  });
  sleep(1);
}
