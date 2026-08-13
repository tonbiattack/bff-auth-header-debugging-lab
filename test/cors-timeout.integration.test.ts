import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createBffApp } from "../src/app.js";
import { startDownstreamStub, type DownstreamStub } from "./downstream-stub.js";

describe("BFFのクロスオリジンとタイムアウトの契約", () => {
  let downstream: DownstreamStub | undefined;

  afterEach(async () => {
    await downstream?.close();
    downstream = undefined;
  });

  it("許可済みフロントエンドからのプリフライトに必要なCORSヘッダーを返す", async () => {
    const app = createBffApp("http://127.0.0.1:1");

    const response = await request(app)
      .options("/api/dashboard")
      .set("Origin", "https://app.example.test")
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "Authorization");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("https://app.example.test");
    expect(response.headers["access-control-allow-methods"]).toContain("GET");
    expect(response.headers["access-control-allow-headers"]).toContain("Authorization");
  });

  it("下流APIが期限を超えても完了を待たず、504を返す", async () => {
    downstream = await startDownstreamStub({
      responseDelaysMs: { "/tasks": 150 }
    });
    const app = createBffApp(downstream.baseUrl);

    const response = await request(app)
      .get("/api/dashboard")
      .set("Authorization", "Bearer user-token");

    expect(response.status).toBe(504);
    expect(response.body).toEqual({ message: "下流APIの応答が期限を超えました" });
  });
});
