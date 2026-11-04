import type { AiProvider } from "#shared/aiProviders";
import type { ErrorKey, MessageParams } from "#shared/messages";
import { AppError } from "../errors";

export interface AiConfig {
  provider: AiProvider;
  baseUrl: string;
  apiKey: string | null;
  model: string;
}

/** The AI provider failed or gave an answer Learnarr can't use; the provider is to blame, hence 502. */
export class AiError extends AppError {
  constructor(key: ErrorKey, params: MessageParams = {}) {
    super(502, key, params);
    this.name = "AiError";
  }
}

const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_MAX_TOKENS = 8192;

function isLocal(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return (
      host === "localhost" ||
      /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
      !host.includes(".")
    );
  } catch {
    return false;
  }
}

/** Local models on modest hardware can take minutes for a whole episode. */
function timeoutMs(config: AiConfig): number {
  return isLocal(config.baseUrl) ? 10 * 60_000 : 2 * 60_000;
}

function root(config: AiConfig): string {
  return config.baseUrl.replace(/\/+$/, "");
}

function headersFor(config: AiConfig): Record<string, string> {
  if (config.provider === "anthropic") {
    return {
      "content-type": "application/json",
      "anthropic-version": ANTHROPIC_VERSION,
      ...(config.apiKey ? { "x-api-key": config.apiKey } : {}),
    };
  }
  return {
    "content-type": "application/json",
    ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
  };
}

async function request(
  config: AiConfig,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const where = config.baseUrl;
  let response: Response;
  try {
    response = await fetchImpl(`${root(config)}${path}`, {
      ...init,
      headers: headersFor(config),
      signal: AbortSignal.timeout(timeoutMs(config)),
    });
  } catch (error) {
    throw new AiError(
      (error as Error).name === "TimeoutError" ? "errors.ai.timeout" : "errors.ai.unreachable",
      {
        where,
      },
    );
  }
  if (response.status === 401 || response.status === 403)
    throw new AiError("errors.ai.rejectedKey", { where });
  if (response.status === 404) throw new AiError("errors.ai.unknownModel", { where });
  if (response.status === 429) throw new AiError("errors.ai.rateLimited", { where });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new AiError("errors.ai.httpError", { where, status: response.status, detail });
  }
  return response.json();
}

/** One system + user prompt in, the model's text out. */
export async function complete(
  config: AiConfig,
  system: string,
  user: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  if (config.provider === "anthropic") {
    const data = (await request(
      config,
      "/v1/messages",
      {
        method: "POST",
        body: JSON.stringify({
          model: config.model,
          max_tokens: ANTHROPIC_MAX_TOKENS,
          system,
          messages: [{ role: "user", content: user }],
        }),
      },
      fetchImpl,
    )) as { content?: { type: string; text?: string }[]; stop_reason?: string };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    if (!text) throw new AiError(data.stop_reason === "refusal" ? "errors.ai.declined" : "errors.ai.empty");
    return text;
  }

  const data = (await request(
    config,
    "/chat/completions",
    {
      method: "POST",
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
    fetchImpl,
  )) as { choices?: { message?: { content?: string | null }; finish_reason?: string }[] };
  const choice = data.choices?.[0];
  const text = choice?.message?.content;
  if (!text) {
    throw new AiError(choice?.finish_reason === "length" ? "errors.ai.outOfRoom" : "errors.ai.empty");
  }
  return text;
}

export async function listModels(config: AiConfig, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const data = (await request(
    config,
    config.provider === "anthropic" ? "/v1/models?limit=100" : "/models",
    { method: "GET" },
    fetchImpl,
  )) as { data?: { id: string }[] };
  return (data.data ?? []).map((m) => m.id).toSorted();
}
