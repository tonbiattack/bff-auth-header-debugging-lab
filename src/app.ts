import express from "express";
import type { DashboardResponse, Profile, Task } from "./types.js";

const allowedFrontendOrigin = "https://app.example.test";
const downstreamTimeoutMs = 75;

function isTimeoutError(error: unknown) {
  return error instanceof DOMException && error.name === "TimeoutError";
}

export function createBffApp(downstreamBaseUrl: string) {
  const app = express();

  app.use((request, response, next) => {
    const origin = request.header("origin");
    if (origin !== allowedFrontendOrigin) {
      next();
      return;
    }

    response.setHeader("Access-Control-Allow-Origin", allowedFrontendOrigin);
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Authorization");
    response.setHeader("Vary", "Origin");

    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }

    next();
  });

  app.get("/api/dashboard", async (request, response) => {
    const authorization = request.header("authorization");
    const authHeaders: Record<string, string> = authorization ? { authorization } : {};
    console.info(`[bff] 受信した認証情報の有無: ${authorization !== undefined}`);

    try {
      const [profileResponse, tasksResponse] = await Promise.all([
        fetch(`${downstreamBaseUrl}/profile`, {
          headers: authHeaders,
          signal: AbortSignal.timeout(downstreamTimeoutMs)
        }),
        fetch(`${downstreamBaseUrl}/tasks`, {
          headers: authHeaders,
          signal: AbortSignal.timeout(downstreamTimeoutMs)
        })
      ]);

      if (!profileResponse.ok || !tasksResponse.ok) {
        response.status(502).json({
          message: "下流APIの呼び出しに失敗しました",
          profileStatus: profileResponse.status,
          tasksStatus: tasksResponse.status
        });
        return;
      }

      const profile = (await profileResponse.json()) as Profile;
      const tasks = (await tasksResponse.json()) as Task[];
      const dashboard: DashboardResponse = {
        displayName: profile.displayName,
        openTaskCount: tasks.filter((task) => task.status === "OPEN").length
      };

      response.status(200).json(dashboard);
    } catch (error) {
      if (isTimeoutError(error)) {
        console.info(`[bff] 下流APIの応答が ${downstreamTimeoutMs}ms を超過しました`);
        response.status(504).json({ message: "下流APIの応答が期限を超えました" });
        return;
      }

      console.error("[bff] 下流API呼び出しで予期しないエラーが発生しました", error);
      response.status(502).json({ message: "下流APIへ接続できませんでした" });
    }
  });

  return app;
}
