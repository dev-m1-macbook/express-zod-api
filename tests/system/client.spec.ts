import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { expectType } from "tsd";
import { config } from "../../example/config";
import { waitFor } from "../helpers";
import {
  ExpressZodAPIClient,
  Provider,
  jsonEndpoints,
} from "../../example/example.client";
import fetch from "node-fetch";

describe("Example", () => {
  let example: ChildProcessWithoutNullStreams;
  let out = "";
  const listener = (chunk: Buffer) => {
    out += chunk.toString();
  };

  beforeAll(() => {
    example = spawn("ts-node", ["example/index.ts"]);
    example.stdout.on("data", listener);
  });

  afterAll(async () => {
    example.stdout.removeListener("data", listener);
    example.kill();
    await waitFor(() => example.killed);
  });

  afterEach(() => {
    out = "";
  });

  const createDefaultProvider =
    (host: string): Provider =>
    async (method, path, params) => {
      const urlParams =
        method === "get" ? new URLSearchParams(params).toString() : "";
      const response = await fetch(`${host}${path}?${urlParams}`, {
        method: `${method}`,
        body: method === "get" ? undefined : JSON.stringify(params),
      });
      if (`${method} ${path}` in jsonEndpoints) {
        return response.json();
      }
      return response.text();
    };

  const client = new ExpressZodAPIClient(
    createDefaultProvider(`http://localhost:${config.server.listen}`)
  );

  test("Should listen", async () => {
    await waitFor(() => /Listening 8090/.test(out));
    expect(true).toBeTruthy();
  });

  test("Should perform the request with a positive response", async () => {
    const response = await client.provide("get", "/v1/user/retrieve", {
      id: "10",
    });
    expect(response).toMatchSnapshot();
    expectType<
      | { status: "success"; data: { id: number; name: string } }
      | { status: "error"; error: { message: string } }
    >(response);
  });
});
