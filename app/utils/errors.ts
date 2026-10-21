/** The message to show for a failed $fetch: the server's statusMessage when it sent one. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  const e = error as {
    data?: { statusMessage?: string; message?: string };
    statusMessage?: string;
    message?: string;
  };
  return e?.data?.statusMessage || e?.data?.message || e?.statusMessage || e?.message || fallback;
}
