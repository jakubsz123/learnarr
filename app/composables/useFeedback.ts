/**
 * The one-line result under a form: "Saved." in green, or why it failed in red.
 * `run` does the work and fills it in, so a form doesn't repeat the try/catch.
 */
export function useFeedback() {
  const { errorText } = useErrorMessage();
  const text = ref("");
  const ok = ref(false);
  const busy = ref(false);

  function succeed(message: string) {
    text.value = message;
    ok.value = true;
  }

  function fail(error: unknown) {
    text.value = errorText(error);
    ok.value = false;
  }

  async function run<T>(work: () => Promise<T>, success?: (result: T) => string): Promise<T | undefined> {
    busy.value = true;
    text.value = "";
    try {
      const result = await work();
      if (success) succeed(success(result));
      return result;
    } catch (error) {
      fail(error);
      return undefined;
    } finally {
      busy.value = false;
    }
  }

  return { text, ok, busy, run, succeed, fail, clear: () => (text.value = "") };
}
