import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import config from "../../config";
import { getOrMintClinicToken } from "./service";
import { resolveMyQueueAndCounter } from "../availability/service";

// Full refetch (debounced) on any queue-lifecycle event. SUBSCRIBE_QUEUE is
// scoped to this doctor's own queue — SUBSCRIBE_TV would leak other patients.
const QUEUE_EVENTS = [
  "queue:token-called",
  "queue:status-changed",
  "queue:cascade-updated",
];

const DEBOUNCE_MS = 400;

// Live-refreshes the Appointment/Queue tab when Pm-queue-management pushes a
// change from elsewhere (KEA, the auto-NO_SHOW sweep, another session). Call
// with `enabled: isQueueManagementEnabled` and useAppointments()'s `refetch`.
export default function useQueueManagementLiveRefresh({ enabled, onUpdate }) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const [connectionInfo, setConnectionInfo] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setConnectionInfo(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const [token, resolved] = await Promise.all([
        getOrMintClinicToken(),
        resolveMyQueueAndCounter(),
      ]);
      if (!cancelled && token && resolved?.queue?.id) {
        setConnectionInfo({ token, queueId: resolved.queue.id });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !connectionInfo) return undefined;
    const { token, queueId } = connectionInfo;

    const socket = io(config.chikitsalay_api_url, {
      path: "/socket.io",
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
    });

    let debounceTimer = null;
    const debouncedUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => onUpdateRef.current?.(), DEBOUNCE_MS);
    };

    socket.on("connect", () => {
      socket.emit("SUBSCRIBE_QUEUE", { queueId });
      debouncedUpdate();
    });
    QUEUE_EVENTS.forEach((event) => socket.on(event, debouncedUpdate));

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, connectionInfo]);
}
