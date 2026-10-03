// ─── Device & Session ──────────────────────────────────────────────────────
export type DeviceType = "phone" | "laptop" | "desktop" | "tablet" | "smartboard";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "waiting"
  | "sending"
  | "receiving"
  | "completed"
  | "disconnected"
  | "reconnecting"
  | "failed";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: ConnectionStatus;
  joinedAt: number;
}

// ─── Transfer Protocol ─────────────────────────────────────────────────────
export type MessageType =
  | "TRANSFER_REQUEST"
  | "TRANSFER_ACCEPT"
  | "TRANSFER_DECLINE"
  | "FILE_START"
  | "FILE_CHUNK"
  | "FILE_COMPLETE"
  | "TRANSFER_COMPLETE"
  | "TRANSFER_CANCEL"
  | "TRANSFER_ERROR"
  | "TRANSFER_PAUSE"
  | "TRANSFER_RESUME";

export type SignalingMessageType =
  | "JOIN_ROOM"
  | "ROOM_JOINED"
  | "PEER_JOINED"
  | "PEER_LEFT"
  | "OFFER"
  | "ANSWER"
  | "ICE_CANDIDATE"
  | "ROOM_ERROR";

export interface SignalingMessage {
  type: SignalingMessageType;
  roomId?: string;
  peerId?: string;
  device?: Partial<Device>;
  peers?: Device[];
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  error?: string;
}

export interface TransferMessage {
  type: MessageType;
  transferId: string;
  fileId?: string;
  files?: FileMetadata[];
  chunkIndex?: number;
  totalChunks?: number;
  data?: ArrayBuffer;
  checksum?: string;
  progress?: number;
  error?: string;
}

// ─── File Transfer ─────────────────────────────────────────────────────────
export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface TransferState {
  id: string;
  peerId: string;
  peerName: string;
  files: FileMetadata[];
  totalSize: number;
  transferred: number;
  speed: number;        // bytes/s
  eta: number;          // seconds
  status: "pending" | "active" | "paused" | "completed" | "failed" | "cancelled";
  direction: "sending" | "receiving";
  startedAt: number;
}

// ─── Room ──────────────────────────────────────────────────────────────────
export interface Room {
  id: string;           // e.g. "MINT-PANDA-72"
  code: string;         // 6-char code
  devices: Device[];
  createdAt: number;
  expiresAt: number;
}
