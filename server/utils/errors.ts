import { H3Error } from "h3";
import { englishMessage, type ErrorKey, type MessageParams } from "#shared/messages";

/**
 * Every error a person may see. It is sent like any h3 error, with the English
 * message as `statusMessage`, and with its message key and parameters in
 * `data`, so the browser can show it in the reader's language (see
 * app/utils/errors.ts). Throw it anywhere; h3 turns it into the response.
 */
export class AppError extends H3Error<{ key: ErrorKey; params: MessageParams }> {
  constructor(statusCode: number, key: ErrorKey, params: MessageParams = {}) {
    const message = englishMessage(key, params);
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.statusMessage = message;
    this.data = { key, params };
  }
}
