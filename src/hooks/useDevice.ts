"use client";
import { useState, useEffect } from "react";
import { generateDeviceName, generateId, detectDeviceType } from "@/lib/device";
import type { DeviceType } from "@/types";

export interface MyDevice {
  id:   string;
  name: string;
  type: DeviceType;
}

export function useDevice(): {
  device: MyDevice | null;
  setName: (name: string) => void;
} {
  const [device, setDevice] = useState<MyDevice | null>(null);

  useEffect(() => {
    const storedId   = localStorage.getItem("anydrop_id")   ?? generateId(12);
    const storedName = localStorage.getItem("anydrop_name") ?? generateDeviceName();
    const type       = detectDeviceType();

    localStorage.setItem("anydrop_id",   storedId);
    localStorage.setItem("anydrop_name", storedName);

    setDevice({ id: storedId, name: storedName, type });
  }, []);

  const setName = (name: string) => {
    const safe = name.trim().slice(0, 40) || device?.name || generateDeviceName();
    localStorage.setItem("anydrop_name", safe);
    setDevice(prev => prev ? { ...prev, name: safe } : prev);
  };

  return { device, setName };
}
