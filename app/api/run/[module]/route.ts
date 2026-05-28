import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";

const ROOT = path.resolve(process.cwd());

function sse(text: string): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`);
}
function sseDone(exitCode: number): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify({ done: true, exitCode })}\n\n`);
}

function buildCommand(moduleId: string, config: Record<string, unknown>): { cmd: string; args: string[] } | null {
  const targetUrl = (config.targetUrl as string) ?? "";
  const azure = (config.azure as Record<string, string>) ?? {};
  const zap = (config.zap as Record<string, string>) ?? {};

  switch (moduleId) {
    case "smoke":
      return { cmd: "k6", args: ["run", "--env", `TARGET_URL=${targetUrl}`, path.join(ROOT, "lib/load/smoke.js")] };
    case "stress":
      return { cmd: "k6", args: ["run", "--env", `TARGET_URL=${targetUrl}`, path.join(ROOT, "lib/load/stress.js")] };
    case "fuzz":
      return {
        cmd: "npx",
        args: ["ts-node", path.join(ROOT, "lib/fuzz/run-zap.ts")],
      };
    case "sast":
      return { cmd: "npx", args: ["ts-node", path.join(ROOT, "lib/sast/scan.ts")] };
    case "auth":
      return { cmd: "npx", args: ["ts-node", path.join(ROOT, "lib/auth/test-auth.ts")] };
    default:
      return null;
  }
}

export async function POST(req: NextRequest, { params }: { params: { module: string } }) {
  const body = await req.json();
  const { config } = body as { config: Record<string, unknown> };
  const moduleId = params.module;

  const command = buildCommand(moduleId, config);
  if (!command) {
    return new Response(`data: ${JSON.stringify({ text: `Unknown module: ${moduleId}` })}\n\ndata: ${JSON.stringify({ done: true, exitCode: 1 })}\n\n`, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TARGET_URL: (config.targetUrl as string) ?? "",
    AZURE_TENANT_ID: ((config.azure as Record<string, string>)?.tenantId) ?? "",
    AZURE_CLIENT_ID: ((config.azure as Record<string, string>)?.clientId) ?? "",
    AZURE_CLIENT_SECRET: ((config.azure as Record<string, string>)?.clientSecret) ?? "",
    AZURE_SCOPE: ((config.azure as Record<string, string>)?.scope) ?? "",
    ZAP_API_KEY: ((config.zap as Record<string, string>)?.apiKey) ?? "",
    ZAP_PORT: ((config.zap as Record<string, string>)?.port) ?? "8090",
  };

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn(command.cmd, command.args, { env, cwd: ROOT, shell: true });

      proc.stdout.on("data", (data: Buffer) => {
        controller.enqueue(sse(data.toString()));
      });
      proc.stderr.on("data", (data: Buffer) => {
        controller.enqueue(sse(data.toString()));
      });
      proc.on("error", (err) => {
        controller.enqueue(sse(`Failed to start process: ${err.message}\nMake sure the required tool is installed.`));
        controller.enqueue(sseDone(1));
        controller.close();
      });
      proc.on("close", (code) => {
        controller.enqueue(sseDone(code ?? 1));
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
