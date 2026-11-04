import type { ErrorKey, MessageParams } from "#shared/messages";

/**
 * Turning failures into text in the reader's language: a failed request, or a
 * stored reason (a job's or a model download's) that came with its message key.
 */
export function useErrorMessage() {
  const { t } = useI18n();
  const { languageName } = useLanguageNames();
  const withNames = (params: MessageParams = {}) =>
    typeof params.language === "string" ? { ...params, language: languageName(params.language) } : params;
  return {
    errorText: (error: unknown) => errorMessage(error, t, languageName),
    reasonText: (reason: { key: ErrorKey; params: MessageParams } | null | undefined, fallback: string) =>
      reason ? t(reason.key, withNames(reason.params)) : fallback,
  };
}
