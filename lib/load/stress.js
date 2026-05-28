// k6 stress test — ramps VUs to find the breaking point.
// Run: k6 run lib/load/stress.js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m",  target: 50  },  // ramp up
    { duration: "5m",  target: 50  },  // hold
    { duration: "2m",  target: 100 },  // push higher
    { duration: "5m",  target: 100 },  // hold
    { duration: "2m",  target: 0   },  // ramp down
  ],
  thresholds: {
    // http_req_failed omitted — backend APIs return 401 on unauthenticated
    // requests which k6 counts as failures. Custom checks cover liveness.
    http_req_duration: ["p(95)<5000"],
  },
};

const TARGET = __ENV.TARGET_URL || "https://your-app.azurewebsites.net";

export default function () {
  const res = http.get(TARGET, { redirects: 0 });
  check(res, {
    "server is up":    (r) => r.status > 0,
    "no server crash": (r) => r.status < 500,
  });
  sleep(1);
}
