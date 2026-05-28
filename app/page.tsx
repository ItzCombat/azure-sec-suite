"use client";

import { useState } from "react";
import ConfigForm, { Config } from "@/components/ConfigForm";
import ModuleCard from "@/components/ModuleCard";

const MODULES = [
  {
    id: "smoke",
    label: "Smoke Test",
    icon: "💨",
    description: "5 VUs for 30s — quick availability check.",
    requiresZap: false,
    requiresAzure: false,
  },
  {
    id: "stress",
    label: "Stress Test",
    icon: "⚡",
    description: "Ramp to 100 VUs over 12 minutes — find the breaking point.",
    requiresZap: false,
    requiresAzure: false,
  },
  {
    id: "fuzz",
    label: "API Fuzzing",
    icon: "🔍",
    description: "OWASP ZAP spider + active scan. Requires ZAP running locally.",
    requiresZap: true,
    requiresAzure: false,
  },
  {
    id: "sast",
    label: "Dependency Scan",
    icon: "🛡️",
    description: "npm audit + Trivy filesystem and secret scan.",
    requiresZap: false,
    requiresAzure: false,
  },
  {
    id: "auth",
    label: "Auth Tests",
    icon: "🔐",
    description: "Azure AD token flow, unauthenticated access, tampered token.",
    requiresZap: false,
    requiresAzure: true,
  },
] as const;

export default function Dashboard() {
  const [config, setConfig] = useState<Config | null>(null);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-80 shrink-0 border-r border-slate-700 bg-slate-900 p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Azure Sec Suite</h1>
          <p className="text-xs text-slate-400 mt-1">Security testing dashboard</p>
        </div>
        <ConfigForm onSave={setConfig} />
        {config && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-xs text-emerald-400">
            ✓ Targeting <span className="font-mono break-all">{config.targetUrl}</span>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Test Modules</h2>
          <p className="text-sm text-slate-400 mt-1">
            {config ? "Select a module to run." : "Configure a target URL in the sidebar to begin."}
          </p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {MODULES.map((mod) => (
            <ModuleCard key={mod.id} module={mod} config={config} />
          ))}
        </div>
      </main>
    </div>
  );
}
