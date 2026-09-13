"use client";

import React, { useState, useEffect } from "react";
import {
  useEditorSettings,
  FONT_FAMILY_OPTIONS,
} from "../hooks/useEditorSettings";
import { useTerminalSettings } from "../hooks/useTerminalSettings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  Sliders,
  Terminal,
  Cpu,
  Keyboard,
  User,
  RotateCcw,
  Check,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Database,
  LogOut,
  Search,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

interface DiagnosticsData {
  success: boolean;
  environment: {
    platform: string;
    arch: string;
    release: string;
    hostname: string;
    nodeVersion: string;
  };
  tools: Record<
    string,
    {
      name: string;
      command: string;
      available: boolean;
      version: string;
      error?: string;
    }
  >;
}

interface UserProfile {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: "ADMIN" | "USER" | "PREMIUM_USER";
  accounts?: { provider: string }[];
}

type SettingsTab = "editor" | "terminal" | "diagnostics" | "shortcuts" | "account";

export function SettingsView({ user }: { user?: UserProfile | null }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("editor");

  const {
    settings: editorSettings,
    updateSettings: updateEditorSettings,
    resetSettings: resetEditorSettings,
  } = useEditorSettings();

  const {
    settings: termSettings,
    updateSettings: updateTermSettings,
    resetSettings: resetTermSettings,
  } = useTerminalSettings();

  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [browserIsolation, setBrowserIsolation] = useState({
    crossOriginIsolated: false,
    sharedArrayBuffer: false,
  });

  const [shortcutFilter, setShortcutFilter] = useState("");

  const loadDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const res = await fetch("/api/settings/diagnostics");
      const data = await res.json();
      setDiagnostics(data);
    } catch {
      toast.error("Failed to run toolchain diagnostics");
    } finally {
      setIsDiagnosing(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
    if (typeof window !== "undefined") {
      setBrowserIsolation({
        crossOriginIsolated: window.crossOriginIsolated || false,
        sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
      });
    }
  }, []);

  const shortcuts = [
    { key: "Ctrl + S", desc: "Save currently active file", category: "Editor" },
    { key: "Ctrl + Shift + S", desc: "Save all open files", category: "Editor" },
    { key: "Ctrl + Enter", desc: "Run current project / program", category: "Execution" },
    { key: "Ctrl + C", desc: "Interrupt / stop running execution process", category: "Terminal" },
    { key: "Ctrl + L", desc: "Clear terminal buffer", category: "Terminal" },
    { key: "Ctrl + B", desc: "Toggle file tree sidebar visibility", category: "Workbench" },
    { key: "Arrow Up / Down", desc: "Cycle terminal command history", category: "Terminal" },
    { key: "Ctrl + /", desc: "Toggle line comment in editor", category: "Editor" },
    { key: "Ctrl + F", desc: "Find text in active file", category: "Editor" },
    { key: "Ctrl + H", desc: "Find and replace text", category: "Editor" },
  ];

  const filteredShortcuts = shortcuts.filter(
    (s) =>
      s.key.toLowerCase().includes(shortcutFilter.toLowerCase()) ||
      s.desc.toLowerCase().includes(shortcutFilter.toLowerCase()) ||
      s.category.toLowerCase().includes(shortcutFilter.toLowerCase())
  );

  const navTabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "editor", label: "Editor", icon: Sliders },
    { id: "terminal", label: "Terminal", icon: Terminal },
    { id: "diagnostics", label: "Diagnostics", icon: Cpu },
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
    { id: "account", label: "Account", icon: User },
  ];

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-4xl mx-auto w-full bg-transparent text-zinc-900 dark:text-zinc-100">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Settings className="size-5 text-zinc-600 dark:text-zinc-400" />
          <span>Settings</span>
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Configure editor preferences, terminal behavior, and inspect toolchains.
        </p>
      </div>

      {/* Simple, Flat Tab Navigation (No Box/Card outlines) */}
      <div className="flex items-center gap-8 border-b border-zinc-200 dark:border-zinc-800">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-xs transition-colors relative cursor-pointer ${
                isActive
                  ? "font-medium text-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-900 dark:bg-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* 1. EDITOR SETTINGS */}
      {activeTab === "editor" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Monaco Editor
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Customize editing experience and code formatting.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetEditorSettings();
                toast.success("Editor settings reset to defaults");
              }}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="size-3" />
              Reset defaults
            </button>
          </div>

          <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-xs">
            {/* Font Family */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Font Family
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select monospaced font family.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FONT_FAMILY_OPTIONS.map((opt) => {
                  const isSelected = editorSettings.fontFamily === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => updateEditorSettings({ fontFamily: opt.value })}
                      className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Size */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Font Size
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Font scale in pixels ({editorSettings.fontSize}px).
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-56">
                <input
                  type="range"
                  min={12}
                  max={22}
                  step={1}
                  value={editorSettings.fontSize}
                  onChange={(e) =>
                    updateEditorSettings({ fontSize: Number(e.target.value) })
                  }
                  className="cursor-pointer h-1.5 flex-1 bg-zinc-200 dark:bg-zinc-800 accent-zinc-900 dark:accent-zinc-100"
                />
                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 w-8 text-right">
                  {editorSettings.fontSize}px
                </span>
              </div>
            </div>

            {/* Tab Size */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Tab Size
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Indentation width per tab.
                </p>
              </div>
              <div className="flex gap-1.5">
                {[2, 4].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateEditorSettings({ tabSize: size })}
                    className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                      editorSettings.tabSize === size
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    {size} Spaces
                  </button>
                ))}
              </div>
            </div>

            {/* Cursor Style */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Cursor Style
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Caret appearance in editor.
                </p>
              </div>
              <div className="flex gap-1.5">
                {(["line", "block", "underline"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => updateEditorSettings({ cursorStyle: style })}
                    className={`px-3 py-1 text-xs capitalize rounded transition-colors cursor-pointer ${
                      editorSettings.cursorStyle === style
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Cursor Animation */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Cursor Blinking
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Caret animation style.
                </p>
              </div>
              <div className="flex gap-1.5">
                {(["smooth", "blink", "solid"] as const).map((blink) => (
                  <button
                    key={blink}
                    type="button"
                    onClick={() => updateEditorSettings({ cursorBlinking: blink })}
                    className={`px-3 py-1 text-xs capitalize rounded transition-colors cursor-pointer ${
                      editorSettings.cursorBlinking === blink
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    {blink}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimap */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Minimap
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Show code overview thumbnail.
                </p>
              </div>
              <Switch
                checked={editorSettings.minimap}
                onCheckedChange={(checked) => updateEditorSettings({ minimap: checked })}
              />
            </div>

            {/* Word Wrap */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Word Wrap
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Wrap long lines automatically.
                </p>
              </div>
              <Switch
                checked={editorSettings.wordWrap === "on"}
                onCheckedChange={(checked) =>
                  updateEditorSettings({ wordWrap: checked ? "on" : "off" })
                }
              />
            </div>

            {/* Line Numbers */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Line Numbers
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Show line numbers in gutter.
                </p>
              </div>
              <Switch
                checked={editorSettings.lineNumbers === "on"}
                onCheckedChange={(checked) =>
                  updateEditorSettings({ lineNumbers: checked ? "on" : "off" })
                }
              />
            </div>

            {/* Bracket Colorization */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Bracket Matching
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Colorize matching bracket pairs.
                </p>
              </div>
              <Switch
                checked={editorSettings.bracketPairColorization}
                onCheckedChange={(checked) =>
                  updateEditorSettings({ bracketPairColorization: checked })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. TERMINAL SETTINGS */}
      {activeTab === "terminal" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Integrated Terminal
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure terminal font scale and scroll buffer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetTermSettings();
                toast.success("Terminal settings reset to defaults");
              }}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="size-3" />
              Reset defaults
            </button>
          </div>

          <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-xs">
            {/* Terminal Font Size */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Terminal Font Size
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Scale of console text ({termSettings.fontSize}px).
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-56">
                <input
                  type="range"
                  min={11}
                  max={18}
                  step={1}
                  value={termSettings.fontSize}
                  onChange={(e) =>
                    updateTermSettings({ fontSize: Number(e.target.value) })
                  }
                  className="cursor-pointer h-1.5 flex-1 bg-zinc-200 dark:bg-zinc-800 accent-zinc-900 dark:accent-zinc-100"
                />
                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 w-8 text-right">
                  {termSettings.fontSize}px
                </span>
              </div>
            </div>

            {/* Scrollback Buffer */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Scrollback Limit
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Lines preserved in terminal buffer.
                </p>
              </div>
              <div className="flex gap-1.5">
                {[1000, 5000, 10000].map((lines) => (
                  <button
                    key={lines}
                    type="button"
                    onClick={() => updateTermSettings({ scrollback: lines })}
                    className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                      termSettings.scrollback === lines
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    {lines.toLocaleString()} lines
                  </button>
                ))}
              </div>
            </div>

            {/* Cursor Style */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Cursor Style
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Terminal caret shape.
                </p>
              </div>
              <div className="flex gap-1.5">
                {(["block", "underline", "bar"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => updateTermSettings({ cursorStyle: style })}
                    className={`px-3 py-1 text-xs capitalize rounded transition-colors cursor-pointer ${
                      termSettings.cursorStyle === style
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Cursor Blinking */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Cursor Blinking
                </Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Blink cursor when terminal is active.
                </p>
              </div>
              <Switch
                checked={termSettings.cursorBlinking}
                onCheckedChange={(checked) => updateTermSettings({ cursorBlinking: checked })}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. LOCAL TOOLCHAIN DIAGNOSTICS */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Toolchain Diagnostics
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Native compilers and runtimes detected on your local system.
              </p>
            </div>
            <button
              type="button"
              onClick={loadDiagnostics}
              disabled={isDiagnosing}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`size-3 ${isDiagnosing ? "animate-spin" : ""}`} />
              Check again
            </button>
          </div>

          <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-xs">
            {diagnostics?.tools &&
              Object.entries(diagnostics.tools).map(([key, tool]) => (
                <div key={key} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    {tool.available ? (
                      <CheckCircle2 className="size-4 text-zinc-900 dark:text-zinc-100 shrink-0" />
                    ) : (
                      <XCircle className="size-4 text-zinc-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 mr-2">
                        {tool.name}
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                        {tool.available ? tool.version : tool.error || "Not installed"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {tool.available ? "Ready" : "Missing"}
                  </span>
                </div>
              ))}

            {/* WebContainer / Cross-Origin Isolation Status */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 mr-2">
                  Cross-Origin Isolation
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {browserIsolation.crossOriginIsolated
                    ? "window.crossOriginIsolated active"
                    : "Inactive"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {browserIsolation.crossOriginIsolated ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 mr-2">
                  SharedArrayBuffer
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {browserIsolation.sharedArrayBuffer ? "Supported in browser" : "Unavailable"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {browserIsolation.sharedArrayBuffer ? "Supported" : "Unavailable"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. KEYBOARD SHORTCUTS */}
      {activeTab === "shortcuts" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Key combinations for navigation and execution.
              </p>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter shortcuts..."
                value={shortcutFilter}
                onChange={(e) => setShortcutFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-transparent border-b border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
            </div>
          </div>

          <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-xs">
            {filteredShortcuts.map((s) => (
              <div
                key={s.key}
                className="py-2.5 flex items-center justify-between gap-4"
              >
                <span className="text-zinc-700 dark:text-zinc-300">{s.desc}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono">
                    {s.category}
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-mono text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 rounded">
                    {s.key}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ACCOUNT & PROFILE */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Account
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Authentication and workspace storage session.
            </p>
          </div>

          <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-xs">
            {/* Profile */}
            <div className="py-4 flex items-center gap-4">
              <Avatar className="size-12 border border-zinc-200 dark:border-zinc-800">
                <AvatarImage src={user?.image || ""} alt={user?.name || "Avatar"} />
                <AvatarFallback className="text-xs font-semibold uppercase">
                  {user?.name?.slice(0, 2) || "DE"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {user?.name || "Developer"}
                </div>
                <div className="text-zinc-500 dark:text-zinc-400">
                  {user?.email || "No email"}
                </div>
              </div>
            </div>

            {/* Clear cache */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  Clear Session Cache
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Clears local terminal memory buffers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.clear();
                  toast.success("Session cache cleared");
                }}
                className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors"
              >
                Clear
              </button>
            </div>

            {/* Sign Out */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  Sign Out
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  End active session on this browser.
                </p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/auth" })}
                className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
