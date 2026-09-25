import { io, type Socket } from "socket.io-client";
import { getAuthSession } from "./auth";
import { apiRequest } from "./api";
import {
  announceRealtimeNotification,
  incrementUnreadNotificationCount,
  setUnreadNotificationCount,
  unreadNotificationCount,
  type RealtimeNotification,
} from "./notifications";

const apiBaseUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1"
).replace(/\/$/, "");
let activeSocket: Socket | null = null;
let activeToken: string | null = null;
let latestUnreadRequest = 0;
let receivedEventCount = 0;

function parseNotification(value: unknown): RealtimeNotification | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<RealtimeNotification>;
  if (
    typeof item.id !== "string" ||
    typeof item.title !== "string" ||
    typeof item.message !== "string" ||
    typeof item.link !== "string" ||
    typeof item.createdAt !== "string"
  )
    return null;
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    link: item.link,
    readAt: null,
    createdAt: item.createdAt,
  };
}

export function startNotificationRealtime() {
  const session = getAuthSession();
  if (!session || session.user.role !== "USER") {
    stopNotificationRealtime();
    return;
  }
  if (activeSocket && activeToken === session.accessToken) return;

  stopNotificationRealtime();
  activeToken = session.accessToken;
  const apiUrl = new URL(apiBaseUrl, window.location.origin);
  const socket = io(`${apiUrl.origin}/notifications`, {
    auth: { token: session.accessToken },
    transports: ["websocket"],
    reconnection: true,
    timeout: 10_000,
  });
  activeSocket = socket;

  socket.on("connect", () => void refreshUnreadNotificationCount());
  socket.on("notification.created", (value: unknown) => {
    if (getAuthSession()?.accessToken !== session.accessToken) return;
    const notification = parseNotification(value);
    if (!notification) return;
    receivedEventCount += 1;
    incrementUnreadNotificationCount();
    announceRealtimeNotification(notification);
    void refreshUnreadNotificationCount();
  });
}

export async function refreshUnreadNotificationCount() {
  const session = getAuthSession();
  if (!session || session.user.role !== "USER") {
    setUnreadNotificationCount(0);
    return;
  }

  const requestId = ++latestUnreadRequest;
  const observedEventCount = receivedEventCount;
  try {
    const result = await apiRequest<{ count: number }>(
      "/notifications/unread-count",
    );
    if (
      requestId !== latestUnreadRequest ||
      getAuthSession()?.accessToken !== session.accessToken
    )
      return;
    if (observedEventCount === receivedEventCount) {
      setUnreadNotificationCount(result.count);
    } else {
      // An event arrived while this REST request was in flight. Never let an
      // older snapshot erase its increment; the event-triggered refresh follows.
      setUnreadNotificationCount(
        Math.max(result.count, unreadNotificationCount.value),
      );
    }
  } catch {
    // REST remains the source of truth; retry on reconnect, route change, or focus.
  }
}

export function stopNotificationRealtime() {
  if (activeSocket) {
    activeSocket.removeAllListeners();
    activeSocket.disconnect();
  }
  activeSocket = null;
  activeToken = null;
}
