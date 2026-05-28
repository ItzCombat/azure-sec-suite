// k6 stress test — ramps VUs to find the breaking point.
// Run: k6 run src/load/stress.js
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
    http_req_failed:   ["rate<0.05"],
    http_req_duration: ["p(95)<5000"],
  },
};

const TARGET = __ENV.TARGET_URL || "https://your-app.azurewebsites.net";

export default function () {
  const res = http.get(TARGET);
  check(res, { "status 2xx": (r) => r.status >= 200 && r.status < 300 });
  sleep(1);
}
