import express from "express";
import type { DashboardResponse, Profile, Task } from "./types.js";

export function createBffApp(downstreamBaseUrl: string) {
  const app = express();

  app.get("/api/dashboard", async (request, response) => {
    const authorization = request.header("authorization");
    const authHeaders: Record<string, string> = authorization ? { authorization } : {};
    console.info(`[bff] 受信した認証情報の有無: ${authorization !== undefined}`);

    try {
      const [profileResponse, tasksResponse] = await Promise.all([
        fetch(`${downstreamBaseUrl}/profile`, { headers: authHeaders }),
        fetch(`${downstreamBaseUrl}/tasks`, { headers: authHeaders })
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
      console.error("[bff] 下流API呼び出しで予期しないエラーが発生しました", error);
      response.status(502).json({ message: "下流APIへ接続できませんでした" });
    }
  });

  return app;
}
