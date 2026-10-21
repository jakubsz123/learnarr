/** Cards due now, for the Study badge. */
export function useDueCount() {
  const count = useState<number>("due-count", () => 0);
  async function refresh() {
    const data = await $fetch<{ count: number }>("/api/study/count").catch(() => null);
    if (data) count.value = data.count;
  }
  return { count, refresh };
}
