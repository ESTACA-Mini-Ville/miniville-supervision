"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MessagePayload } from "@/lib/msgTypes";
import type { SubscribeMsg, WSContextValue, WSMessage } from "./wsTypes";

// A runtime-unchecked subscriber type that accepts the union MessagePayload.
// Callers may provide a narrower typed callback; we store the callback as
// accepting MessagePayload and invoke it with whatever payload arrived.
export type RuntimeMsgCallback = (msg: MessagePayload) => void;

const WSContext = createContext<WSContextValue | null>(null);

export const WebSocketProvider: React.FC<{
  url?: string;
  children: React.ReactNode;
}> = ({ url = "ws://localhost:8080", children }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef(new Map<string, Set<RuntimeMsgCallback>>());
  // topics that have been advertised by the server: topic -> { type }
  const advertisedRef = useRef(new Map<string, { type?: string }>());
  // topics we have already sent a subscribe for (remote side)
  const remoteSubscribedRef = useRef(new Set<string>());
  const queueRef = useRef<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const backoffRef = useRef<number>(1000);
  const reconnectTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const sendMessage = useCallback((msg: WSMessage | object) => {
    const s = JSON.stringify(msg);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(s);
      } catch (e) {
        console.error("[WebSocketProvider] error sending message", e);
        queueRef.current.push(s);
      }
    } else {
      queueRef.current.push(s);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      // Don't create multiple sockets
      if (!mountedRef.current) return;

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          backoffRef.current = 1000;

          // flush queue
          while (queueRef.current.length > 0) {
            const s = queueRef.current.shift();
            if (s && ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(s);
              } catch (e) {
                console.error(
                  "[WebSocketProvider] error sending queued message",
                  e,
                );
                // push back and break
                queueRef.current.unshift(s);
                break;
              }
            } else {
              break;
            }
          }

          // re-subscribe to existing topics only if advertised (include type)
          const keys = Array.from(subscribersRef.current.keys());
          for (const topic of keys) {
            if (remoteSubscribedRef.current.has(topic)) {
              continue;
            }
            const adv = advertisedRef.current.get(topic);
            if (adv?.type) {
              // mark intent to subscribe remotely to avoid double-send races
              remoteSubscribedRef.current.add(topic);
              const subMsg = {
                op: "subscribe",
                topic,
                type: adv.type,
              } as SubscribeMsg;
              // use sendMessage to centralize queueing
              try {
                sendMessage(subMsg);
              } catch (e) {
                console.error(
                  "[WebSocketProvider] error sending subscribe message",
                  e,
                );
              }
            }
          }
        };

        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data as string);
            // handle special ops
            if (data.op === "advertise" && typeof data.topic === "string") {
              advertisedRef.current.set(data.topic, { type: data.type });
              // if we have local subscribers waiting, send subscribe with type (once)
              if (
                subscribersRef.current.has(data.topic) &&
                !remoteSubscribedRef.current.has(data.topic)
              ) {
                // mark intent to subscribe to avoid races
                remoteSubscribedRef.current.add(data.topic);
                const subMsg = {
                  op: "subscribe",
                  topic: data.topic,
                  type: data.type,
                } as SubscribeMsg;
                try {
                  sendMessage(subMsg);
                } catch (e) {
                  console.error(
                    "[WebSocketProvider] error sending subscribe message",
                    e,
                  );
                  // ignored
                }
              }
              // continue to handle incoming in case server also sends advertise+publish etc.
            } else if (
              data.op === "unadvertise" &&
              typeof data.topic === "string"
            ) {
              advertisedRef.current.delete(data.topic);
              // if we were remotely subscribed, mark unsubscribed
              if (remoteSubscribedRef.current.has(data.topic)) {
                remoteSubscribedRef.current.delete(data.topic);
                // optionally notify server we unsubscribe? server already unadvertised; skip sending unsubscribe
              }
            }
            handleIncoming(data);
          } catch (e) {
            console.error("[WebSocketProvider] error handling message", e);
            // ignore non-json
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          // schedule reconnect
          if (!mountedRef.current) return;
          const delay = backoffRef.current;
          backoffRef.current = Math.min(
            Math.max(1500, backoffRef.current * 1.5),
            30000,
          );
          reconnectTimerRef.current = window.setTimeout(() => {
            connect();
          }, delay) as unknown as number;
        };

        ws.onerror = () => {
          // close will trigger reconnect
          try {
            ws.close();
          } catch (e) {
            console.error("[WebSocketProvider] error closing socket", e);
          }
        };
      } catch (e) {
        console.error("[WebSocketProvider] error connecting", e);
        // schedule reconnect on construction failure
        setIsConnected(false);
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, backoffRef.current) as unknown as number;
      }
    }

    function handleIncoming(data: WSMessage) {
      if (!data || typeof data !== "object") return;
      if (data.op === "publish") {
        const set = subscribersRef.current.get(data.topic);
        if (set) {
          for (const cb of Array.from(set)) {
            try {
              cb(data.msg);
            } catch (e) {
              console.error("[WebSocketProvider] error handling publish", e);
            }
          }
        }
      }
      // other ops can be implemented if needed
    }

    connect();

    return () => {
      mountedRef.current = false;
      setIsConnected(false);
      try {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
      } catch (e) {
        console.error("[WebSocketProvider] error clearing reconnect timer", e);
      }
      try {
        wsRef.current?.close();
      } catch (e) {
        console.error("[WebSocketProvider] error closing socket", e);
      }
      wsRef.current = null;
    };
  }, [url, sendMessage]);

  const publish = useCallback(
    (topic: string, message: MessagePayload) => {
      sendMessage({ op: "publish", topic, msg: message });
    },
    [sendMessage],
  );

  const subscribeTopic = useCallback(
    <T extends MessagePayload = MessagePayload>(
      topic: string,
      cb: (msg: T) => void,
    ) => {
      // store the callback as a runtime callback that accepts the union
      const runtimeCb: RuntimeMsgCallback = cb as RuntimeMsgCallback;
      let set = subscribersRef.current.get(topic);
      if (!set) {
        set = new Set();
        subscribersRef.current.set(topic, set);
      }
      set.add(runtimeCb);

      // if the topic is advertised and we haven't subscribed remotely, send subscribe with type
      const adv = advertisedRef.current.get(topic);
      if (adv?.type && !remoteSubscribedRef.current.has(topic)) {
        // mark intent first to avoid double sends
        remoteSubscribedRef.current.add(topic);
        sendMessage({ op: "subscribe", topic, type: adv.type } as SubscribeMsg);
      }

      // return unsubscribe function
      return () => {
        const s = subscribersRef.current.get(topic);
        if (!s) return;
        s.delete(runtimeCb);
        if (s.size === 0) {
          subscribersRef.current.delete(topic);
          // only send unsubscribe if we had previously subscribed remotely
          if (remoteSubscribedRef.current.has(topic)) {
            sendMessage({ op: "unsubscribe", topic });
            remoteSubscribedRef.current.delete(topic);
          }
        }
      };
    },
    [sendMessage],
  );

  const value: WSContextValue = useMemo(
    () => ({
      sendMessage,
      publish,
      subscribeTopic,
      isConnected,
      url,
    }),
    [sendMessage, publish, subscribeTopic, isConnected, url],
  );

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
};

export function useWebSocket() {
  const ctx = useContext(WSContext);
  if (!ctx)
    throw new Error("useWebSocket must be used inside WebSocketProvider");
  return ctx;
}
