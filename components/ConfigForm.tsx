"use client";

import { useState } from "react";

export interface Config {
  targetUrl: string;
  azure: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    scope: string;
  };
  zap: {
    apiKey: string;
    port: string;
  };
}

export default function ConfigForm({ onSave }: { onSave: (c: Config) => void }) {
  const [targetUrl, setTargetUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scope, setScope] = useState("");
  const [zapKey, setZapKey] = useState("");
  const [zapPort, setZapPort] = useState("8090");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      targetUrl,
      azure: { tenantId, clientId, clientSecret, scope },
      zap: { apiKey: zapKey, port: zapPort },
    });
  }

  const inputCls =
    "w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";
  const labelCls = "block text-xs font-medium text-slate-400 mb-1";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Target URL *</label>
        <input
          className={inputCls}
          type="url"
          placeholder="https://your-app.azurewebsites.net"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          required
        />
      </div>

      <button
        type="button"
        className="text-xs text-slate-400 hover:text-slate-200 text-left flex items-center gap-1"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        <span>{showAdvanced ? "▾" : "▸"}</span>
        Advanced (Azure AD + ZAP)
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-3 border-l border-slate-700 pl-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Azure AD</p>
          {[
            { label: "Tenant ID", val: tenantId, set: setTenantId, ph: "xxxxxxxx-xxxx-..." },
            { label: "Client ID", val: clientId, set: setClientId, ph: "xxxxxxxx-xxxx-..." },
            { label: "Client Secret", val: clientSecret, set: setClientSecret, ph: "•••••••••", type: "password" },
            { label: "Scope", val: scope, set: setScope, ph: "https://app/.default" },
          ].map(({ label, val, set, ph, type }) => (
            <div key={label}>
              <label className={labelCls}>{label}</label>
              <input className={inputCls} type={type ?? "text"} placeholder={ph} value={val} onChange={(e) => set(e.target.value)} />
            </div>
          ))}

          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">OWASP ZAP</p>
          {[
            { label: "API Key", val: zapKey, set: setZapKey, ph: "your-zap-key", type: "password" },
            { label: "Port", val: zapPort, set: setZapPort, ph: "8090" },
          ].map(({ label, val, set, ph, type }) => (
            <div key={label}>
              <label className={labelCls}>{label}</label>
              <input className={inputCls} type={type ?? "text"} placeholder={ph} value={val} onChange={(e) => set(e.target.value)} />
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        Set Target
      </button>
    </form>
  );
}
