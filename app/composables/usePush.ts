/**
 * Push notifications in this browser: whether it can have them, and turning
 * them on or off. On an iPhone they work only once Learnarr is added to the
 * home screen, which is why the app has a manifest.
 */
export function usePush() {
  const supported = ref(false);
  const subscribed = ref(false);

  async function refresh() {
    supported.value = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported.value) return;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    subscribed.value = Boolean(await reg?.pushManager.getSubscription());
  }

  async function enable(publicKey: string) {
    if (!supported.value) throw new LocalError("errors.push.unsupported");
    if ((await Notification.requestPermission()) !== "granted") throw new LocalError("errors.push.denied");
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const subscription =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey),
      }));
    const json = subscription.toJSON();
    await api("/api/me/push", {
      method: "POST",
      body: {
        endpoint: json.endpoint ?? "",
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      },
    });
    subscribed.value = true;
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await reg?.pushManager.getSubscription();
    if (subscription) {
      await api("/api/me/push", { method: "DELETE", body: { endpoint: subscription.endpoint } });
      await subscription.unsubscribe();
    }
    subscribed.value = false;
  }

  onMounted(refresh);
  return { supported, subscribed, enable, disable };
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
