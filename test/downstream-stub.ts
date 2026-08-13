import http from "node:http";

export type DownstreamStub = {
  baseUrl: string;
  receivedAuthorizations: Array<string | undefined>;
  close: () => Promise<void>;
};

const expectedAuthorization = "Bearer user-token";

export async function startDownstreamStub(): Promise<DownstreamStub> {
  const receivedAuthorizations: Array<string | undefined> = [];

  const server = http.createServer((request, response) => {
    const authorization = request.headers.authorization;
    receivedAuthorizations.push(authorization);
    console.info(
      `[downstream-stub] ${request.method} ${request.url} authorization=${String(authorization)}`
    );

    if (authorization !== expectedAuthorization) {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ message: "認証情報が不足しています" }));
      return;
    }

    response.setHeader("content-type", "application/json");
    if (request.url === "/profile") {
      response.end(JSON.stringify({ id: "user-1", displayName: "山田花子" }));
      return;
    }

    if (request.url === "/tasks") {
      response.end(
        JSON.stringify([
          { id: "task-1", status: "OPEN" },
          { id: "task-2", status: "DONE" },
          { id: "task-3", status: "OPEN" }
        ])
      );
      return;
    }

    response.writeHead(404);
    response.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("下流APIスタブの待受ポートを取得できませんでした");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    receivedAuthorizations,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}
