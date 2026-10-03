// Shared signaling protocol types (used by both server and client)

export type SignalingMsgType =
  | "JOIN_ROOM"
  | "ROOM_JOINED"
  | "PEER_JOINED"
  | "PEER_LEFT"
  | "OFFER"
  | "ANSWER"
  | "ICE_CANDIDATE"
  | "ROOM_ERROR"
  | "PING"
  | "PONG";

export interface DeviceInfo {
  id: string;
  name: string;
  type: "phone" | "laptop" | "desktop" | "tablet" | "smartboard";
}

export interface SignalingMsg {
  type: SignalingMsgType;
  roomId?: string;
  fromId?: string;
  toId?: string;
  device?: DeviceInfo;
  peers?: DeviceInfo[];
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  error?: string;
}
