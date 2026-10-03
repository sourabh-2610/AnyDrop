// Friendly adjectives + nouns for device name generation
const ADJECTIVES = [
  "Calm","Cool","Cozy","Happy","Lazy","Mint","Soft","Tiny","Wild","Bold",
  "Warm","Blue","Gold","Dark","Fast","Slow","Sage","Rosy","Hazy","Kind",
];
const NOUNS = [
  "Panda","Tiger","Eagle","Pixel","Mango","Rocket","Penguin","Fox","Cloud",
  "Potato","Koala","Cactus","Moon","Star","Wave","Breeze","Quill","Lynx",
];

export function generateDeviceName(): string {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

export function generateId(length = 8): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function generateRoomCode(): string {
  const words = [
    "MINT","SAGE","PINE","MOSS","DUSK","DAWN","TIDE","COVE","GALE","MIST",
  ];
  const animals = [
    "PANDA","TIGER","EAGLE","LYNX","CRANE","BISON","HERON","GECKO","QUAIL",
  ];
  const w = words[Math.floor(Math.random() * words.length)];
  const a = animals[Math.floor(Math.random() * animals.length)];
  const n = String(Math.floor(Math.random() * 90) + 10);
  return `${w}-${a}-${n}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(seconds: number): string {
  if (seconds < 60)  return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function detectDeviceType(): import("@/types").DeviceType {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|android.*tablet/.test(ua))  return "tablet";
  if (/iphone|android|mobile/.test(ua)) return "phone";
  return "laptop";
}
