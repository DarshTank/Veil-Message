"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function InspectProtectionGuard() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchSetting = async () => {
      try {
        const res = await axios.get("/api/admin/settings/inspect");
        if (res.data.success && isMounted) {
          setIsEnabled(Boolean(res.data.inspectProtectionEnabled));
        }
      } catch (err) {
        // Ignore errors
      }
    };

    fetchSetting();
    // 3-second polling interval for cross-browser sync
    const interval = setInterval(fetchSetting, 3000);

    // Listen for instant custom event in same window
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.enabled === "boolean") {
        setIsEnabled(customEvent.detail.enabled);
      }
    };

    // BroadcastChannel for instant real-time cross-tab sync
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("veil_inspect_protection");
      bc.onmessage = (event) => {
        if (event.data && typeof event.data.enabled === "boolean") {
          setIsEnabled(event.data.enabled);
        }
      };
    }

    window.addEventListener("inspect_setting_changed", handleCustomEvent);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("inspect_setting_changed", handleCustomEvent);
      if (bc) bc.close();
    };
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    // Prevent Right Click / Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent DevTools Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key.toUpperCase();

      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      // Ctrl+Shift+I / Cmd+Option+I (Inspect)
      // Ctrl+Shift+J / Cmd+Option+J (Console)
      // Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
      if (isCtrlOrCmd && (isShift || e.altKey) && ["I", "J", "C"].includes(key)) {
        e.preventDefault();
        return;
      }

      // Ctrl+U / Cmd+U (View Source)
      // Ctrl+S / Cmd+S (Save Page)
      if (isCtrlOrCmd && ["U", "S"].includes(key)) {
        e.preventDefault();
        return;
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEnabled]);

  return null;
}
