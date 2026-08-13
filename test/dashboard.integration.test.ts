import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createBffApp } from "../src/app.js";
import { startDownstreamStub, type DownstreamStub } from "./downstream-stub.js";

describe("GET /api/dashboard", () => {
  let downstream: DownstreamStub | undefined;

  afterEach(async () => {
    await downstream?.close();
    downstream = undefined;
  });

  it("認証済みユーザーのプロフィールと未完了タスク数を集約して返す", async () => {
    downstream = await startDownstreamStub();
    const app = createBffApp(downstream.baseUrl);

    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", "Bearer user-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      displayName: "山田花子",
      openTaskCount: 2
    });
    expect(downstream.receivedAuthorizations).toEqual([
      "Bearer user-token",
      "Bearer user-token"
    ]);
  });
});
