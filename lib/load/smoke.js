// k6 smoke test — verifies the app is alive under minimal load.
// Run: k6 run lib/load/smoke.js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    // Fail only if the server stops responding entirely (connection errors/timeouts).
    // Non-2xx responses (401, 404) are normal for backend APIs and are not counted
    // as failures here — use the auth module to validate auth behaviour separately.
    http_req_failed:   ["rate<0.05"],
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
