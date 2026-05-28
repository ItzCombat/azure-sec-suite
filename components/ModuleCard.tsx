"use client";

import { useState, useRef, useEffect } from "react";
import { Config } from "./ConfigForm";

type Status = "idle" | "running" | "done" | "error";

interface Module {
  id: string;
  label: string;
  icon: string;
  description: string;
  requiresZap: boolean;
  requiresAzure: boolean;
}

const STATUS_BADGE: Record<Status, string> = {
  idle:    "bg-slate-700 text-slate-400",
  running: "bg-yellow-900/60 text-yellow-400 animate-pulse",
  done:    "bg-emerald-900/60 text-emerald-400",
  error:   "bg-red-900/60 text-red-400",
};

const STATUS_LABEL: Record<Status, string> = {
  idle: "Idle", running: "Running…", done: "Complete", error: "Failed",
};

export default function ModuleCard({ module: mod, config }: { module: Module; config: Config | null }) {
  const [status, setStatus] = useState<Status>("idle");
  const [lines, setLines] = useState<string[]>([]);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [lines]);

  const disabled = !config || status === "running";
  const missingZap = mod.requiresZap && config && !config.zap.apiKey;
  const missingAzure = mod.requiresAzure && config && !config.azure.tenantId;

  async function run() {
    if (!config) return;
    setLines([]);
    setStatus("running");

    try {
      const res = await fetch(`/api/run/${mod.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (!res.ok || !res.body) {
        setStatus("error");
        setLines([`Error: ${res.statusText}`]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.text) setLines((l) => [...l, ...payload.text.split("\n").filter(Boolean)]);
            if (payload.done) setStatus(payload.exitCode === 0 ? "done" : "error");
          } catch {}
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLines((l) => [...l, `Error: ${msg}`]);
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{mod.icon}</span>
          <div>
            <h3 className="font-semibold text-white text-sm">{mod.label}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Warnings */}
      {(missingZap || missingAzure) && (
        <div className="mx-5 mb-3 rounded-md border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-400">
          {missingZap && "⚠ Set ZAP API Key in Advanced config to run this module."}
          {missingAzure && "⚠ Set Azure AD credentials in Advanced config to run this module."}
        </div>
      )}

      {/* Terminal output */}
      {lines.length > 0 && (
        <div
          ref={termRef}
          className="terminal mx-5 mb-3 h-48 overflow-y-auto rounded-md border border-slate-700 bg-slate-950 p-3 text-slate-300"
        >
          {lines.map((line, i) => (
            <div key={i} className={line.includes("FAIL") || line.includes("Error") ? "text-red-400" : line.includes("PASS") || line.includes("✓") ? "text-emerald-400" : ""}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-700 px-5 py-3">
        <button
          onClick={run}
          disabled={disabled || !!missingZap || !!missingAzure}
          className="rounded-md bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800"
        >
          {status === "running" ? "Running…" : "Run"}
        </button>
        {status !== "idle" && (
          <button
            onClick={() => { setStatus("idle"); setLines([]); }}
            className="ml-3 text-xs text-slate-500 hover:text-slate-300"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
