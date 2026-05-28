// k6 smoke test — verifies the app is alive under minimal load.
// Run: k6 run src/load/smoke.js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_failed:   ["rate<0.01"],   // <1% error rate
    http_req_duration: ["p(95)<2000"],  // 95th percentile under 2s
  },
};

const TARGET = __ENV.TARGET_URL || "https://your-app.azurewebsites.net";

export default function () {
  const res = http.get(TARGET);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time OK": (r) => r.timings.duration < 2000,
  });
  sleep(1);
}
