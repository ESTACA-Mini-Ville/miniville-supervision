// Typed definitions for the WebSocket JSON encoding protocol described in
// https://integration-service.docs.eprosima.com/en/v3.0.0/user_manual/systemhandle/websocket_sh.html#json-encoding-protocol

import type { BaseMessagePayload } from "@/lib/msgTypes";

export type Op =
  | "advertise"
  | "unadvertise"
  | "publish"
  | "subscribe"
  | "unsubscribe";

export interface BaseMessage {
  op: Op;
  id?: string;
}

export interface AdvertiseMsg extends BaseMessage {
  op: "advertise";
  topic: string;
  type: string;
}

export interface UnadvertiseMsg extends BaseMessage {
  op: "unadvertise";
  topic: string;
}

export interface PublishMsg extends BaseMessage {
  op: "publish";
  topic: string;
  msg: BaseMessagePayload;
}

export interface SubscribeMsg extends BaseMessage {
  op: "subscribe";
  topic: string;
  type?: string;
}

export interface UnsubscribeMsg extends BaseMessage {
  op: "unsubscribe";
  topic: string;
}

export type WSMessage =
  | AdvertiseMsg
  | UnadvertiseMsg
  | PublishMsg
  | SubscribeMsg
  | UnsubscribeMsg;

export interface WSContextValue {
  sendMessage: (msg: WSMessage | object) => void;
  publish: (topic: string, msg: BaseMessagePayload) => void;
  subscribeTopic: (topic: string, cb: MsgCallback) => () => void;
  isConnected: boolean;
  url: string;
}

export type MsgCallback = (msg: BaseMessagePayload) => void;
