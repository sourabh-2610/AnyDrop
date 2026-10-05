// Client-side signaling message types (mirrors server/types.ts, but uses browser RTCSessionDescriptionInit)
export type SignalingMsgType =
  | "JOIN_ROOM"
  | "LEAVE_ROOM"
  | "ROOM_JOINED"
  | "PEER_JOINED"
  | "PEER_LEFT"
  | "OFFER"
  | "ANSWER"
  | "ICE_CANDIDATE"
  | "TRANSFER_DATA"
  | "ROOM_ERROR"
  | "PING"
  | "PONG";

export interface DeviceInfo {
  id:   string;
  name: string;
  type: "phone" | "laptop" | "desktop" | "tablet" | "smartboard";
}

export interface SignalingMsg {
  type:      SignalingMsgType;
  roomId?:   string;
  fromId?:   string;
  toId?:     string;
  device?:   DeviceInfo;
  peers?:    DeviceInfo[];
  sdp?:      RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  error?:    string;
}
