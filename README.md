# azure-sec-suite

Security testing suite for Azure-hosted applications. Covers load/stress testing, API fuzzing (DAST), dependency scanning (SAST), and Azure AD auth validation.

## Setup

```bash
npm install
cp .env.example .env
# fill in TARGET_URL and Azure credentials in .env
```

## Modules

### Load testing (k6)
Install k6: https://k6.io/docs/get-started/installation/

```bash
npm run load:smoke   # 5 VUs for 30s — quick sanity check
npm run load:stress  # ramp to 100 VUs — find the breaking point
```

### API fuzzing / DAST (OWASP ZAP)
1. Install ZAP: https://www.zaproxy.org/download/
2. Start ZAP in daemon mode:
   ```bash
   zaproxy -daemon -port 8090 -config api.key=your-key-here
   ```
3. Set `ZAP_API_KEY` and `ZAP_PORT` in `.env`, then:
   ```bash
   npm run fuzz
   ```
Report saved to `reports/zap-alerts.json`.

### Dependency scanning (SAST)
Install Trivy: https://trivy.dev/latest/getting-started/installation/

```bash
npm run sast
```
Reports saved to `reports/npm-audit.json`, `reports/trivy-fs.json`, `reports/trivy-secrets.json`.

### Auth testing (Azure AD)
Set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and `AZURE_SCOPE` in `.env`, then:

```bash
npm run auth
```

Tests run: authenticated request, unauthenticated request (must return 401/403), tampered-token rejection.

## Reports

All reports land in `reports/` (git-ignored). Keep them local — they may contain sensitive endpoint data.
