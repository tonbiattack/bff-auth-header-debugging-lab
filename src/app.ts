import express from "express";
import type { DashboardResponse, Profile, Task } from "./types.js";

export function createBffApp(downstreamBaseUrl: string) {
  const app = express();

  app.get("/api/dashboard", async (request, response) => {
    const authorization = request.header("authorization");

    try {
      const [profileResponse, tasksResponse] = await Promise.all([
        fetch(`${downstreamBaseUrl}/profile`, {
          headers: {
            // BUG: Node.jsの受信ヘッダーには小文字のキーでアクセスする必要がある。
            Authorization: request.headers.Authorization as string | undefined
          }
        }),
        fetch(`${downstreamBaseUrl}/tasks`, {
          headers: {
            // BUG: 同じ誤りにより、タスク取得にも認証情報が渡らない。
            Authorization: request.headers.Authorization as string | undefined
          }
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
      console.error("[bff] 下流API呼び出しで予期しないエラーが発生しました", error);
      response.status(502).json({ message: "下流APIへ接続できませんでした" });
    }
  });

  return app;
}
