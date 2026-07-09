/** Thin wrapper around the standard web Notification API. Entirely
 * feature-detected and opt-in (see settings.desktopNotifications) — a
 * call is only ever assessed on-device, so a notification firing means
 * the browser itself is showing it, nothing is sent anywhere. */

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | null {
  return notificationsSupported() ? Notification.permission : null;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!notificationsSupported()) return null;
  try {
    return await Notification.requestPermission();
  } catch {
    return null;
  }
}

export function showDangerNotification(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icon.svg", tag: "guardianline-danger" });
  } catch {
    // Some browsers (notably iOS Safari) support the permission API but
    // throw on construction outside a service-worker context — fail
    // silently rather than crash an in-progress call.
  }
}
