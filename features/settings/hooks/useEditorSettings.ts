"use client";

import { useState, useEffect, useCallback } from "react";

export interface EditorSettings {
  fontFamily: string;
  fontSize: number;
  tabSize: number;
  minimap: boolean;
  wordWrap: "on" | "off";
  lineNumbers: "on" | "off";
  cursorStyle: "line" | "block" | "underline";
  cursorBlinking: "blink" | "smooth" | "solid";
  bracketPairColorization: boolean;
}

export const FONT_FAMILY_OPTIONS = [
  { label: "JetBrains Mono", value: "'JetBrains Mono', 'Fira Code', monospace" },
  { label: "Fira Code", value: "'Fira Code', 'JetBrains Mono', monospace" },
  { label: "Cascadia Code", value: "'Cascadia Code', Consolas, monospace" },
  { label: "Consolas", value: "Consolas, 'Courier New', monospace" },
  { label: "Monaco / Menlo", value: "Menlo, Monaco, 'Courier New', monospace" },
];

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: 14,
  tabSize: 2,
  minimap: true,
  wordWrap: "on",
  lineNumbers: "on",
  cursorStyle: "line",
  cursorBlinking: "smooth",
  bracketPairColorization: true,
};

const STORAGE_KEY = "code_editor_settings";
const SETTINGS_EVENT = "code_editor_settings_changed";

function getStoredSettings(): EditorSettings {
  if (typeof window === "undefined") return DEFAULT_EDITOR_SETTINGS;
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return DEFAULT_EDITOR_SETTINGS;
    return { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(item) };
  } catch {
    return DEFAULT_EDITOR_SETTINGS;
  }
}

export function useEditorSettings() {
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSettings(getStoredSettings());
    setIsLoaded(true);

    const handleSync = () => {
      setSettings(getStoredSettings());
    };

    window.addEventListener(SETTINGS_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const updateSettings = useCallback((updates: Partial<EditorSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(SETTINGS_EVENT));
      } catch (err) {
        console.error("Failed to save editor settings:", err);
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EDITOR_SETTINGS));
      window.dispatchEvent(new Event(SETTINGS_EVENT));
      setSettings(DEFAULT_EDITOR_SETTINGS);
    } catch (err) {
      console.error("Failed to reset editor settings:", err);
    }
  }, []);

  return {
    settings,
    isLoaded,
    updateSettings,
    resetSettings,
  };
}
