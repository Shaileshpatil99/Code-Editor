"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useExecutionStore } from "../hooks/useExecutionStore";
import { useTerminalSettings } from "@/features/settings/hooks/useTerminalSettings";
import { Button } from "@/components/ui/button";
import {
  Play,
  Square,
  Trash2,
  Terminal as TerminalIcon,
  Loader2,
} from "lucide-react";
import { Templates } from "@/lib/generated/prisma";

interface PlaygroundTerminalProps {
  template?: Templates;
  onInput?: (data: string) => void;
  onRun?: () => void;
  onStop?: () => void;
  onCommand?: (command: string) => void;
  terminalRef?: React.MutableRefObject<{
    write: (data: string) => void;
    writeln: (data: string) => void;
    clear: () => void;
    fit: () => void;
    focus?: () => void;
  } | null>;
}

export const PlaygroundTerminal: React.FC<PlaygroundTerminalProps> = ({
  template,
  onInput,
  onRun,
  onStop,
  onCommand,
  terminalRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { status, exitCode, executionDuration, isRunning } = useExecutionStore();
  const { settings: termSettings } = useTerminalSettings();

  const isWebTemplate =
    template &&
    ["REACT", "NEXTJS", "EXPRESS", "VUE", "HONO", "ANGULAR"].includes(template);

  // Buffer and history state
  const lineBufferRef = useRef<string>("");
  const cursorPosRef = useRef<number>(0);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const isRunningRef = useRef<boolean>(isRunning);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // Clear action
  const handleClear = useCallback(() => {
    if (!termInstanceRef.current) return;
    termInstanceRef.current.clear();
    lineBufferRef.current = "";
    cursorPosRef.current = 0;
    if (!isRunningRef.current && isWebTemplate) {
      termInstanceRef.current.write("\r\n\x1b[34m~/project\x1b[0m \x1b[90m$\x1b[0m ");
    }
  }, [isWebTemplate]);

  // Smart write that preserves user scrollback position if scrolled up
  const writeWithSmartScroll = useCallback((data: string) => {
    const term = termInstanceRef.current;
    if (!term) return;

    const buffer = term.buffer.active;
    const isNearBottom = buffer.viewportY >= buffer.baseY - 1;
    term.write(data);
    if (isNearBottom) {
      term.scrollToBottom();
    }
  }, []);

  const writelnWithSmartScroll = useCallback((data: string) => {
    writeWithSmartScroll(data + "\r\n");
  }, [writeWithSmartScroll]);

  // Click on terminal container to focus
  const handleContainerClick = useCallback(() => {
    termInstanceRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: termSettings.cursorBlinking,
      cursorStyle: termSettings.cursorStyle,
      fontSize: termSettings.fontSize,
      lineHeight: 1.35,
      letterSpacing: 0,
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Consolas, monospace",
      theme: {
        background: "#0D1117",
        foreground: "#C9D1D9",
        cursor: "#58A6FF",
        cursorAccent: "#0D1117",
        selectionBackground: "#264F78",
        selectionInactiveBackground: "#1B3A57",
        black: "#0D1117",
        red: "#FF7B72",
        green: "#3FB950",
        yellow: "#D29922",
        blue: "#58A6FF",
        magenta: "#BC8CFF",
        cyan: "#39C5CF",
        white: "#B1BAC4",
        brightBlack: "#484F58",
        brightRed: "#FFA198",
        brightGreen: "#56D364",
        brightYellow: "#E3B341",
        brightBlue: "#79C0FF",
        brightMagenta: "#D2A8FF",
        brightCyan: "#56D4DD",
        brightWhite: "#F0F6FC",
      },
      convertEol: true,
      scrollback: termSettings.scrollback,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    termInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Focus terminal immediately
    term.focus();

    // Initial greeting
    term.writeln("\x1b[90mIntegrated Developer Terminal ready.\x1b[0m");
    if (isWebTemplate) {
      term.write("\x1b[34m~/project\x1b[0m \x1b[90m$\x1b[0m ");
    } else {
      term.writeln(
        "\x1b[90mClick 'Run' to compile and execute with real-time stdin.\x1b[0m"
      );
    }

    // Safe initial fit
    setTimeout(() => {
      try {
        if (containerRef.current && containerRef.current.clientWidth > 0) {
          fitAddon.fit();
        }
      } catch (e) {}
    }, 60);

    // KEYBOARD INPUT CONTROLLER
    const dataDisposable = term.onData((data) => {
      const running = isRunningRef.current;
      const buffer = lineBufferRef.current;
      const pos = cursorPosRef.current;

      // 1. Ctrl+C (Interrupt / Stop)
      if (data === "\x03") {
        term.write("^C\r\n");
        lineBufferRef.current = "";
        cursorPosRef.current = 0;
        historyIdxRef.current = -1;

        if (running) {
          onStop?.();
        } else if (isWebTemplate) {
          term.write("\x1b[34m~/project\x1b[0m \x1b[90m$\x1b[0m ");
        }
        return;
      }

      // 2. Ctrl+L (Clear screen)
      if (data === "\x0c") {
        term.clear();
        if (!running && isWebTemplate) {
          term.write("\x1b[34m~/project\x1b[0m \x1b[90m$\x1b[0m " + buffer);
        } else if (buffer.length > 0) {
          term.write(buffer);
        }
        return;
      }

      // 3. Ctrl+D (EOF)
      if (data === "\x04") {
        if (running && buffer.length === 0) {
          onInput?.("\x04");
        }
        return;
      }

      // 4. Enter / Return (Submit line)
      if (data === "\r" || data === "\n") {
        term.write("\r\n");
        const submittedLine = buffer;
        lineBufferRef.current = "";
        cursorPosRef.current = 0;
        historyIdxRef.current = -1;

        // Record history
        if (submittedLine.trim()) {
          const hist = historyRef.current;
          if (hist.length === 0 || hist[hist.length - 1] !== submittedLine) {
            hist.push(submittedLine);
          }
        }

        if (running) {
          // Program stdin mode: send line buffer to backend child process
          onInput?.(submittedLine + "\n");
        } else {
          // Idle state: WebContainer shell command or helpful guidance
          if (isWebTemplate) {
            if (submittedLine.trim()) {
              onCommand?.(submittedLine.trim());
            } else {
              term.write("\x1b[34m~/project\x1b[0m \x1b[90m$\x1b[0m ");
            }
          } else {
            if (submittedLine.trim()) {
              term.writeln(
                `\x1b[90m[Process is not running. Click 'Run' to execute code]\x1b[0m`
              );
            }
          }
        }
        return;
      }

      // 5. Backspace (\x7f or \x08)
      if (data === "\x7f" || data === "\x08") {
        if (pos > 0) {
          if (pos === buffer.length) {
            lineBufferRef.current = buffer.slice(0, -1);
            cursorPosRef.current = pos - 1;
            term.write("\b \b");
          } else {
            const left = buffer.slice(0, pos - 1);
            const right = buffer.slice(pos);
            lineBufferRef.current = left + right;
            cursorPosRef.current = pos - 1;
            term.write("\b" + right + " " + "\b".repeat(right.length + 1));
          }
        }
        return;
      }

      // 6. Arrow Navigation & History (Escape sequences: \x1b[...)
      if (data.startsWith("\x1b")) {
        // Arrow Up: Command history previous
        if (data === "\x1b[A") {
          const hist = historyRef.current;
          if (hist.length > 0) {
            const nextIdx =
              historyIdxRef.current === -1
                ? hist.length - 1
                : historyIdxRef.current - 1;
            if (nextIdx >= 0) {
              historyIdxRef.current = nextIdx;
              const prevCommand = hist[nextIdx];

              // Erase current input
              term.write(
                "\b".repeat(cursorPosRef.current) +
                  " ".repeat(lineBufferRef.current.length) +
                  "\b".repeat(lineBufferRef.current.length)
              );

              lineBufferRef.current = prevCommand;
              cursorPosRef.current = prevCommand.length;
              term.write(prevCommand);
            }
          }
          return;
        }

        // Arrow Down: Command history next
        if (data === "\x1b[B") {
          const hist = historyRef.current;
          if (historyIdxRef.current !== -1) {
            const nextIdx = historyIdxRef.current + 1;
            if (nextIdx < hist.length) {
              historyIdxRef.current = nextIdx;
              const nextCommand = hist[nextIdx];

              term.write(
                "\b".repeat(cursorPosRef.current) +
                  " ".repeat(lineBufferRef.current.length) +
                  "\b".repeat(lineBufferRef.current.length)
              );

              lineBufferRef.current = nextCommand;
              cursorPosRef.current = nextCommand.length;
              term.write(nextCommand);
            } else {
              historyIdxRef.current = -1;
              term.write(
                "\b".repeat(cursorPosRef.current) +
                  " ".repeat(lineBufferRef.current.length) +
                  "\b".repeat(lineBufferRef.current.length)
              );
              lineBufferRef.current = "";
              cursorPosRef.current = 0;
            }
          }
          return;
        }

        // Arrow Left
        if (data === "\x1b[D") {
          if (cursorPosRef.current > 0) {
            cursorPosRef.current--;
            term.write("\x1b[D");
          }
          return;
        }

        // Arrow Right
        if (data === "\x1b[C") {
          if (cursorPosRef.current < lineBufferRef.current.length) {
            cursorPosRef.current++;
            term.write("\x1b[C");
          }
          return;
        }

        // Home (\x1b[H or \x1b[1~)
        if (data === "\x1b[H" || data === "\x1b[1~") {
          if (cursorPosRef.current > 0) {
            term.write("\x1b[D".repeat(cursorPosRef.current));
            cursorPosRef.current = 0;
          }
          return;
        }

        // End (\x1b[F or \x1b[4~)
        if (data === "\x1b[F" || data === "\x1b[4~") {
          const remaining = lineBufferRef.current.length - cursorPosRef.current;
          if (remaining > 0) {
            term.write("\x1b[C".repeat(remaining));
            cursorPosRef.current = lineBufferRef.current.length;
          }
          return;
        }

        // Ignore other escape sequences
        return;
      }

      // 7. Regular Printable Characters
      if (data >= " ") {
        if (pos === buffer.length) {
          lineBufferRef.current = buffer + data;
          cursorPosRef.current = pos + data.length;
          term.write(data);
        } else {
          const left = buffer.slice(0, pos);
          const right = buffer.slice(pos);
          lineBufferRef.current = left + data + right;
          cursorPosRef.current = pos + data.length;
          term.write(data + right + "\b".repeat(right.length));
        }
      }
    });

    // Resize observer
    let resizeTimeout: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        try {
          if (containerRef.current && containerRef.current.clientWidth > 0) {
            fitAddon.fit();
          }
        } catch (e) {}
      }, 40);
    });

    resizeObserver.observe(containerRef.current);

    // Expose API via terminalRef
    if (terminalRef) {
      terminalRef.current = {
        write: writeWithSmartScroll,
        writeln: writelnWithSmartScroll,
        clear: handleClear,
        fit: () => {
          try {
            fitAddon.fit();
          } catch (e) {}
        },
        focus: () => {
          term.focus();
        },
      };
    }

    return () => {
      clearTimeout(resizeTimeout);
      dataDisposable.dispose();
      resizeObserver.disconnect();
      term.dispose();
      termInstanceRef.current = null;
      fitAddonRef.current = null;
      if (terminalRef) {
        terminalRef.current = null;
      }
    };
  }, [
    isWebTemplate,
    onCommand,
    onInput,
    onStop,
    terminalRef,
    handleClear,
    writeWithSmartScroll,
    writelnWithSmartScroll,
  ]);

  // Dynamically update terminal options when settings change
  useEffect(() => {
    const term = termInstanceRef.current;
    if (term) {
      term.options.fontSize = termSettings.fontSize;
      term.options.cursorBlink = termSettings.cursorBlinking;
      term.options.cursorStyle = termSettings.cursorStyle;
      term.options.scrollback = termSettings.scrollback;
      try {
        fitAddonRef.current?.fit();
      } catch (e) {}
    }
  }, [termSettings]);

  // Status text display (Compact, engineering style)
  const renderStatusBadge = () => {
    switch (status) {
      case "PREPARING":
        return (
          <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            Preparing
          </span>
        );
      case "COMPILING":
        return (
          <span className="flex items-center gap-1 text-[11px] text-zinc-300 font-mono">
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            Compiling
          </span>
        );
      case "RUNNING":
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Running
          </span>
        );
      case "EXITED":
        return (
          <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
            <span
              className={`size-1.5 rounded-full ${
                exitCode === 0 ? "bg-emerald-500" : "bg-red-400"
              }`}
            />
            Exited {exitCode ?? 0}
            {executionDuration
              ? ` · ${(executionDuration / 1000).toFixed(2)}s`
              : ""}
          </span>
        );
      case "COMPILE_ERROR":
        return (
          <span className="flex items-center gap-1 text-[11px] text-red-400 font-mono">
            <span className="size-1.5 rounded-full bg-red-400" />
            Compile Error
          </span>
        );
      case "RUNTIME_ERROR":
        return (
          <span className="flex items-center gap-1 text-[11px] text-red-400 font-mono">
            <span className="size-1.5 rounded-full bg-red-400" />
            Runtime Error
          </span>
        );
      case "TIMEOUT":
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
            <span className="size-1.5 rounded-full bg-amber-400" />
            Timed out · 15.00s
          </span>
        );
      case "STOPPED":
        return (
          <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
            <span className="size-1.5 rounded-full bg-zinc-500" />
            Stopped
          </span>
        );
      case "FAILED":
        return (
          <span className="flex items-center gap-1 text-[11px] text-red-400 font-mono">
            <span className="size-1.5 rounded-full bg-red-400" />
            Failed
          </span>
        );
      case "IDLE":
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
            <span className="size-1.5 rounded-full bg-zinc-600" />
            Idle
          </span>
        );
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full bg-[#0D1117] border-t border-zinc-800 select-none"
      onClick={handleContainerClick}
    >
      {/* Compact Engineering Terminal Header */}
      <div className="flex items-center justify-between px-3 h-8 bg-[#161B22] border-b border-zinc-800/80 text-xs">
        {/* Left Side: TERMINAL + Language Badge */}
        <div className="flex items-center gap-2">
          <TerminalIcon className="size-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-300 uppercase tracking-wide text-[11px] font-mono">
            TERMINAL
          </span>
          {template && (
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
              {template === "CPP" ? "C++" : template === "JAVA" ? "Java" : template}
            </span>
          )}
        </div>

        {/* Right Side: Status Badge + Run/Stop Control + Clear */}
        <div className="flex items-center gap-2">
          {renderStatusBadge()}

          <div className="h-3 w-px bg-zinc-800 mx-0.5" />

          {/* Quick Run / Stop Toggle */}
          {isRunning ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onStop?.();
              }}
              className="h-6 px-2 text-[11px] font-mono text-red-400 hover:text-red-300 hover:bg-red-950/40"
              title="Stop (Ctrl+C)"
            >
              <Square className="size-2.5 mr-1 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onRun?.();
              }}
              disabled={status === "PREPARING" || status === "COMPILING"}
              className="h-6 px-2 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-40"
              title="Run Code"
            >
              {status === "PREPARING" || status === "COMPILING" ? (
                <Loader2 className="size-2.5 mr-1 animate-spin" />
              ) : (
                <Play className="size-2.5 mr-1 fill-current" />
              )}
              Run
            </Button>
          )}

          {/* Clear Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="h-6 px-1.5 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            title="Clear Terminal (Ctrl+L)"
          >
            <Trash2 className="size-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-hidden p-2 cursor-text"
        style={{ minHeight: "80px" }}
      />
    </div>
  );
};

