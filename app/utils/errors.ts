import type { Composer } from "vue-i18n";

type Translate = Composer["t"];

/** A failure in the browser itself (talking to AnkiConnect, push), with a message key like the server's. */
export class LocalError extends Error {
  constructor(
    readonly key: string,
    readonly params: Record<string, string | number> = {},
  ) {
    super(key);
    this.name = "LocalError";
  }
}

/** A failure whose message is already in the reader's language, such as a background job's reason. */
export class ShownError extends Error {
  override name = "ShownError";
}

/**
 * The message to show for a failed request, in the reader's language. The
 * server sends a message key with every error it means a person to read (see
 * server/utils/errors.ts); a language code in its params is shown by name.
 */
export function errorMessage(error: unknown, t: Translate, languageName?: (code: string) => string): string {
  const e = error as {
    data?: {
      data?: { key?: string; params?: Record<string, string | number> };
      message?: string;
      statusMessage?: string;
    };
    statusCode?: number;
    message?: string;
  };
  if (error instanceof LocalError) return t(error.key, error.params);
  if (error instanceof ShownError) return error.message;
  const key = e?.data?.data?.key;
  if (key) {
    const params = { ...e.data?.data?.params };
    if (typeof params.language === "string" && languageName) params.language = languageName(params.language);
    return t(key, params);
  }
  // Without a key the message is ofetch's or the server's internals; say something useful instead.
  return e?.statusCode === undefined ? t("errors.network") : t("errors.unknown");
}

/** better-auth's error codes that a person can act on, by their message key. */
const AUTH_ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "errors.signIn.wrongPassword",
  SIGN_UP_CLOSED: "errors.auth.signUpClosed",
  USER_ALREADY_EXISTS: "errors.users.nameTaken",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "errors.users.nameTaken",
  PASSWORD_TOO_SHORT: "errors.signIn.passwordTooShort",
};

/** The message for a failed sign-in or sign-up, from better-auth's client. */
export function authErrorMessage(error: { code?: string; message?: string }, t: Translate): string {
  const key = error.code ? AUTH_ERRORS[error.code] : undefined;
  return key ? t(key) : error.message || t("errors.unknown");
}
