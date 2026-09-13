"use client";

import { useState, useEffect, useCallback } from "react";

export interface TerminalSettings {
  fontSize: number;
  cursorBlinking: boolean;
  cursorStyle: "block" | "underline" | "bar";
  scrollback: number;
}

export const DEFAULT_TERMINAL_SETTINGS: TerminalSettings = {
  fontSize: 13,
  cursorBlinking: true,
  cursorStyle: "block",
  scrollback: 5000,
};

const STORAGE_KEY = "code_editor_terminal_settings";
const SETTINGS_EVENT = "code_editor_terminal_settings_changed";

function getStoredTerminalSettings(): TerminalSettings {
  if (typeof window === "undefined") return DEFAULT_TERMINAL_SETTINGS;
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return DEFAULT_TERMINAL_SETTINGS;
    return { ...DEFAULT_TERMINAL_SETTINGS, ...JSON.parse(item) };
  } catch {
    return DEFAULT_TERMINAL_SETTINGS;
  }
}

export function useTerminalSettings() {
  const [settings, setSettings] = useState<TerminalSettings>(DEFAULT_TERMINAL_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSettings(getStoredTerminalSettings());
    setIsLoaded(true);

    const handleSync = () => {
      setSettings(getStoredTerminalSettings());
    };

    window.addEventListener(SETTINGS_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const updateSettings = useCallback((updates: Partial<TerminalSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(SETTINGS_EVENT));
      } catch (err) {
        console.error("Failed to save terminal settings:", err);
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TERMINAL_SETTINGS));
      window.dispatchEvent(new Event(SETTINGS_EVENT));
      setSettings(DEFAULT_TERMINAL_SETTINGS);
    } catch (err) {
      console.error("Failed to reset terminal settings:", err);
    }
  }, []);

  return {
    settings,
    isLoaded,
    updateSettings,
    resetSettings,
  };
}
