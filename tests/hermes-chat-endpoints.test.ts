import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HermesChatProxy } from "../src/adapter/hermes/chat-proxy.js";

vi.mock("../src/data-paths.js", () => ({ DATA_DIR: "isolated-test-state" }));
vi.mock("node:fs", () => ({ existsSync: () => true }));
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockRejectedValue(new Error("No saved test session")),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

describe("Hermes chat provider endpoints", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("OPENROUTER_FREE_MODEL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([false, true])("routes OpenRouter with stream=%s to one v1 prefix", async (stream) => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-only-key");
    await checkEndpoint(stream, "https://openrouter.ai/api/v1/chat/completions", "openrouter/free");
  });

  it.each([false, true])("keeps the Hermes endpoint with stream=%s", async (stream) => {
    await checkEndpoint(stream, "http://127.0.0.1:8642/v1/chat/completions", "hermes-agent");
  });

  it("rejects paid OpenRouter models before making an API call", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-only-key");
    vi.stubEnv("OPENROUTER_FREE_MODEL", "paid/model");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const proxy = new HermesChatProxy({ hermesUrl: "http://127.0.0.1:8642", logger });
    await expect(proxy.sendMessageSync("test-paid", "Hello")).rejects.toThrow("Only OpenRouter free models");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

async function checkEndpoint(stream: boolean, endpoint: string, model: string): Promise<void> {
  const sse = 'data: {"choices":[{"delta":{"content":"OK"}}]}\n\ndata: [DONE]\n\n';
  const response = stream
    ? new Response(sse, { headers: { "Content-Type": "text/event-stream" } })
    : Response.json({ choices: [{ message: { content: "OK" } }] });
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  const proxy = new HermesChatProxy({ hermesUrl: "http://127.0.0.1:8642/", logger });
  if (stream) {
    const onDone = vi.fn();
    const onError = vi.fn();
    await proxy.sendMessage("test-stream", "Hello", { onToken: vi.fn(), onDone, onError });
    expect(onError).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledWith("OK");
  } else {
    expect(await proxy.sendMessageSync("test-sync", "Hello")).toBe("OK");
  }
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe(endpoint);
  expect(JSON.parse(options.body)).toMatchObject({ model, stream });
}
