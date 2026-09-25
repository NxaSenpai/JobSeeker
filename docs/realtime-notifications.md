# Real-time notifications

The notification gateway is mounted in the NestJS backend at the Socket.IO namespace `/notifications`, using the WebSocket transport only. It does not enable long-polling. The Socket.IO Engine.IO path is `/socket.io` (the default), separate from the REST API's `/api/v1` prefix.

The Vue client derives the socket origin from `VITE_API_URL` and connects with the signed-in account's access token in the Socket.IO authentication payload:

```ts
io(`${apiOrigin}/notifications`, {
  auth: { token: accessToken },
  transports: ['websocket'],
})
```

The token is not put in the URL, query string, or a client-selectable user room. The server verifies the token using the shared session guard, including signature/expiry, verified-account, suspension, and session-version checks. It takes the recipient identity from the user record loaded by that guard and ignores any user ID or role in client input. Active connections repeat the same check every 60 seconds and are closed if a session expires or is revoked while the socket remains open. Requests with an unconfigured browser `Origin` are rejected; configure `FRONTEND_URL` to the exact frontend origin (comma-separated origins are accepted by the gateway).

## Event

After a notification has been saved and its enclosing transaction has committed, the backend sends `notification.created` only to sockets belonging to `notification.userId`:

```json
{
  "id": "notification-uuid",
  "title": "Application status updated",
  "message": "Your application is now under review.",
  "link": "/applications/application-uuid",
  "readAt": null,
  "createdAt": "2026-09-24T10:00:00.000Z"
}
```

The event contains only the display fields needed by the UI—no account ID, email, application snapshot, or resume data. Current producers are candidate submission/withdrawal, employer status changes, interview create/update/cancel, and company-to-candidate application messages. The client updates the unread badge and refreshes the notifications page when it is open.

## Persistence and recovery

The existing `notifications` table and REST endpoints remain authoritative; this phase adds no database table or migration. On socket connection/reconnection the client refreshes `GET /notifications/unread-count`. The notification page continues to load its entries through `GET /notifications`. A disconnected client can therefore recover persisted items and unread count without replaying socket frames.

Realtime fan-out is process-local and best-effort. A notification remains persisted even if no socket is connected or a send fails. The current deployment must run one backend process for complete live delivery. If the service is later scaled across multiple backend instances, add a shared Socket.IO adapter/broker (and a durable outbox only if guaranteed event delivery becomes a requirement); do not treat this in-memory fan-out as cross-instance delivery.
