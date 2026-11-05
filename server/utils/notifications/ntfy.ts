import { AppError, UPSTREAM_FAILED } from "../errors";
import type { PushMessage } from "./push";

/**
 * ntfy (https://ntfy.sh): notifications through the ntfy app, for people who'd
 * rather not use browser push. Each person picks their own topic; the server is
 * ntfy.sh unless NTFY_URL names a self-hosted one, with NTFY_TOKEN if it needs one.
 */
export async function sendNtfy(
  topic: string,
  message: PushMessage,
  options: { server?: string; token?: string; fetchFn?: typeof fetch } = {},
) {
  const server = (options.server ?? process.env.NTFY_URL ?? "https://ntfy.sh").replace(/\/+$/, "");
  const token = options.token ?? process.env.NTFY_TOKEN;
  const clickUrl = process.env.PUBLIC_URL
    ? new URL(message.url, process.env.PUBLIC_URL).toString()
    : undefined;
  const response = await (options.fetchFn ?? fetch)(server, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({
      topic,
      title: message.title,
      message: message.body,
      tags: ["books"],
      ...(clickUrl ? { click: clickUrl } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new AppError(UPSTREAM_FAILED, "errors.notifications.ntfyFailed", { status: response.status });
}
