"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import TemplateFileTree from "@/features/playground/components/template-file-tree";
import { useFileExplorer } from "@/features/playground/hooks/useFileExplorer";
import { usePlayground } from "@/features/playground/hooks/usePlayground";

import { useParams, useRouter } from "next/navigation";
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import {
  FileText,
  Save,
  X,
  Settings,
  Terminal as TerminalIcon,
  Globe,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Copy,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { TemplateFile } from "@/features/playground/types";
import PlaygroundEditor from "@/features/playground/components/playground-editor";

import { PlaygroundTerminal } from "@/features/execution/components/playground-terminal";
import { ExecutionActionBar } from "@/features/execution/components/execution-action-bar";
import { executionManager } from "@/features/execution/services/execution-manager";
import { useExecutionStore } from "@/features/execution/hooks/useExecutionStore";
import { Templates } from "@/lib/generated/prisma";
import { updatePlaygroundTemplate } from "@/features/playground/actions";
import { toast } from "sonner";

const detectLanguageFromFilename = (
  filename: string | undefined,
  extension: string | undefined,
  baseProjectTemplate: Templates | undefined
): Templates | null => {
  const ext = (extension || "").toLowerCase().trim();
  const name = (filename || "").toLowerCase().trim();

  // 1. Web / React / Frontend extensions (.tsx, .css, .jsx, .html, etc.)
  if (["tsx", "jsx", "css", "scss", "sass", "less", "html", "htm", "vue"].includes(ext)) {
    if (
      baseProjectTemplate &&
      ["REACT", "NEXTJS", "EXPRESS", "VUE", "HONO", "ANGULAR"].includes(baseProjectTemplate)
    ) {
      return baseProjectTemplate;
    }
    return "REACT";
  }

  // 2. TypeScript / JavaScript files in web/node projects
  if (["ts", "js", "mjs", "cjs"].includes(ext)) {
    if (
      name.includes("config") ||
      name === "app" ||
      name === "index" ||
      name === "main" ||
      (baseProjectTemplate &&
        ["REACT", "NEXTJS", "EXPRESS", "VUE", "HONO", "ANGULAR"].includes(baseProjectTemplate))
    ) {
      return baseProjectTemplate &&
        ["REACT", "NEXTJS", "EXPRESS", "VUE", "HONO", "ANGULAR"].includes(baseProjectTemplate)
        ? baseProjectTemplate
        : "REACT";
    }
  }

  // 3. C++
  if (["cpp", "cc", "cxx", "hpp", "h++"].includes(ext)) {
    return "CPP";
  }

  // 4. C
  if (ext === "c" || (ext === "h" && baseProjectTemplate === "C")) {
    return "C";
  }

  // 5. Java
  if (ext === "java") {
    return "JAVA";
  }

  // 6. Python
  if (ext === "py") {
    return "PYTHON";
  }

  return null;
};

const Page = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [isTerminalVisible, setTerminalVisible] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<"terminal" | "preview">(
    "terminal"
  );

  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);

  const [currentPlayground, setCurrentPlayground] = useState<any>(null);

  useEffect(() => {
    if (playgroundData) {
      setCurrentPlayground(playgroundData);
    }
  }, [playgroundData]);

  const { previewUrl } = useExecutionStore();

  const {
    activeFileId,
    closeAllFiles,
    openFile,
    closeFile,
    editorContent,
    updateFileContent,
    handleAddFile,
    handleAddFolder,
    handleDeleteFile,
    handleDeleteFolder,
    handleRenameFile,
    handleRenameFolder,
    openFiles,
    setTemplateData,
    setActiveFileId,
    setPlaygroundId,
    setOpenFiles,
  } = useFileExplorer();

  const terminalRef = useRef<{
    write: (data: string) => void;
    writeln: (data: string) => void;
    clear: () => void;
    fit: () => void;
    focus?: () => void;
  } | null>(null);

  // Horizontal sidebar panel ref and persisted size
  const sidebarPanelRef = useRef<any>(null);
  const [sidebarDefaultSize, setSidebarDefaultSize] = useState<number>(20);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("code_editor_sidebar_size");
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 14 && parsed <= 45) {
          setSidebarDefaultSize(parsed);
          if (sidebarPanelRef.current) {
            sidebarPanelRef.current.resize(`${parsed}%`);
          }
        } else {
          // Reset any corrupt or pixel-derived value to standard 20%
          localStorage.setItem("code_editor_sidebar_size", "20");
          setSidebarDefaultSize(20);
          if (sidebarPanelRef.current) {
            sidebarPanelRef.current.resize("20%");
          }
        }
      }
    }
  }, []);

  React.useEffect(() => {
    if (templateData) {
      setTemplateData(templateData);
    }

    if (id) {
      setPlaygroundId(id);
    }
  }, [templateData, id, setTemplateData, setPlaygroundId]);

  // Cross-Origin Isolation Verification & Client-Side Navigation Sync
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    console.log("[WebContainer Isolation Check] window.crossOriginIsolated:", window.crossOriginIsolated);
    if (window.crossOriginIsolated) {
      console.log("%cWebContainer isolation: ENABLED", "color: #10b981; font-weight: bold; font-size: 13px;");
      sessionStorage.removeItem(`coi_reload_${id}`);
    } else {
      console.warn("%cWebContainer isolation: FAILED", "color: #ef4444; font-weight: bold; font-size: 13px;");

      const hasReloaded = sessionStorage.getItem(`coi_reload_${id}`);
      if (!hasReloaded) {
        sessionStorage.setItem(`coi_reload_${id}`, "true");
        window.location.reload();
      }
    }
  }, [id]);

  // When previewUrl becomes available, automatically show preview tab for web templates
  React.useEffect(() => {
    if (previewUrl) {
      setActiveBottomTab("preview");
    }
  }, [previewUrl]);

  const activeFile = openFiles.find((file) => file.id === activeFileId);
  const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges);

  const activeTemplate = currentPlayground?.template || playgroundData?.template;

  const isWebTemplate =
    activeTemplate &&
    ["REACT", "NEXTJS", "EXPRESS", "VUE", "HONO", "ANGULAR"].includes(
      activeTemplate
    );

  const lastAutoFileIdRef = useRef<string | null>(null);

  // Auto-switch language dropdown when user opens or switches to a file matching a language
  useEffect(() => {
    if (!activeFile) return;

    // Only run when switching to a different file
    if (activeFile.id === lastAutoFileIdRef.current) return;
    lastAutoFileIdRef.current = activeFile.id;

    const baseTemplate = playgroundData?.template;
    const detected = detectLanguageFromFilename(
      activeFile.filename,
      activeFile.fileExtension,
      baseTemplate
    );

    if (detected && detected !== activeTemplate) {
      setCurrentPlayground((prev: any) =>
        prev ? { ...prev, template: detected } : { template: detected }
      );

      const isTargetWeb = ["REACT", "NEXTJS", "EXPRESS", "VUE", "HONO", "ANGULAR"].includes(detected);
      if (!isTargetWeb) {
        useExecutionStore.getState().setPreviewUrl(null);
        setActiveBottomTab("terminal");
      }

      if (id) {
        updatePlaygroundTemplate(id, detected).catch(console.error);
      }

      toast.info(`Language set to ${detected} for .${activeFile.fileExtension}`);
    }
  }, [activeFile?.id, activeFile?.filename, activeFile?.fileExtension, activeTemplate, id, playgroundData?.template]);

  const handleFileSelect = (file: TemplateFile) => {
    openFile(file);
  };

  const handleRun = useCallback(() => {
    if (!activeTemplate) return;

    // Switch to terminal tab when user clicks run
    setActiveBottomTab("terminal");

    executionManager.run(
      activeTemplate,
      templateData,
      openFiles,
      activeFileId,
      id,
      terminalRef.current
    );
  }, [activeTemplate, templateData, openFiles, activeFileId, id]);

  const handleStop = useCallback(() => {
    executionManager.stop();
  }, []);

  const handleTerminalInput = useCallback((data: string) => {
    executionManager.sendInput(data);
  }, []);

  const handleTerminalCommand = useCallback(
    (command: string) => {
      if (!activeTemplate) return;
      executionManager.executeShellCommand(
        activeTemplate,
        command,
        terminalRef.current
      );
    },
    [activeTemplate]
  );

  const [previewKey, setPreviewKey] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

  const handleOpenInNewTab = useCallback(() => {
    if (!previewUrl) {
      toast.info("Development server is not running yet. Click 'Run' to start it.");
      return;
    }

    try {
      const newTab = window.open(previewUrl, "_blank", "noopener");
      if (!newTab || newTab.closed || typeof newTab.closed === "undefined") {
        // Fallback for strict pop-up blockers
        const a = document.createElement("a");
        a.href = previewUrl;
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Failed to open preview in new tab:", err);
      window.open(previewUrl, "_blank");
    }
  }, [previewUrl]);

  const handleRefreshPreview = useCallback(() => {
    if (!previewUrl) return;
    setPreviewKey((k) => k + 1);
    toast.success("Preview reloaded");
  }, [previewUrl]);

  const handleCopyPreviewUrl = useCallback(() => {
    if (!previewUrl) return;
    navigator.clipboard.writeText(previewUrl).then(() => {
      setIsCopied(true);
      toast.success("Preview URL copied to clipboard");
      setTimeout(() => setIsCopied(false), 1000);
    });
  }, [previewUrl]);

  const handleSave = async () => {
    if (templateData) {
      await saveTemplateData(templateData);
    }
  };

  // Language Switcher Handler
  const handleLanguageSwitch = useCallback(
    async (newTemplate: Templates) => {
      if (!id || newTemplate === activeTemplate) return;

      try {
        // 1. Update in DB
        const res = await updatePlaygroundTemplate(id, newTemplate);
        if (!res.success) {
          toast.error(res.error || "Failed to update language");
          return;
        }

        // 2. Update local state
        setCurrentPlayground((prev: any) =>
          prev ? { ...prev, template: newTemplate } : { template: newTemplate }
        );

        // 3. Check for language entrypoint without deleting existing files
        const entrypointMap: Record<
          string,
          { filename: string; fileExtension: string; defaultContent: string }
        > = {
          CPP: {
            filename: "main",
            fileExtension: "cpp",
            defaultContent:
              '#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}\n',
          },
          C: {
            filename: "main",
            fileExtension: "c",
            defaultContent:
              '#include <stdio.h>\n\nint main() {\n    printf("Hello from C!\\n");\n    return 0;\n}\n',
          },
          JAVA: {
            filename: "Main",
            fileExtension: "java",
            defaultContent:
              'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}\n',
          },
          PYTHON: {
            filename: "main",
            fileExtension: "py",
            defaultContent:
              'def main():\n    print("Hello from Python!")\n\nif __name__ == "__main__":\n    main()\n',
          },
        };

        const target = entrypointMap[newTemplate];
        if (target && templateData) {
          const findFile = (folder: any): TemplateFile | null => {
            if (!folder || !folder.items) return null;
            for (const item of folder.items) {
              if (
                item.filename === target.filename &&
                item.fileExtension === target.fileExtension
              ) {
                return item;
              }
              if (item.items) {
                const nested = findFile(item);
                if (nested) return nested;
              }
            }
            return null;
          };

          const existing = findFile(templateData);
          if (existing) {
            openFile(existing);
          } else {
            const newFile: TemplateFile = {
              filename: target.filename,
              fileExtension: target.fileExtension,
              content: target.defaultContent,
            };
            await handleAddFile(
              newFile,
              "",
              async () => {},
              null,
              saveTemplateData
            );
          }
        }

        // If switched to non-web template, reset preview URL and active bottom tab
        const isTargetWeb = ["REACT", "NEXTJS", "EXPRESS", "VUE", "HONO", "ANGULAR"].includes(newTemplate);
        if (!isTargetWeb) {
          useExecutionStore.getState().setPreviewUrl(null);
          setActiveBottomTab("terminal");
        }

        toast.success(`Switched language to ${newTemplate}`);
      } catch (err: any) {
        console.error("Language switch error:", err);
        toast.error("Failed to switch language");
      }
    },
    [id, activeTemplate, templateData, openFile, handleAddFile, saveTemplateData]
  );

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* @ts-ignore */}
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full w-full"
        >
          {/* Resizable Sidebar Panel */}
          <ResizablePanel
            panelRef={sidebarPanelRef}
            defaultSize={`${sidebarDefaultSize}%`}
            minSize="14%"
            maxSize="45%"
            collapsible={true}
            onResize={(panelSize: any) => {
              const pct =
                typeof panelSize === "number"
                  ? panelSize
                  : panelSize?.asPercentage;
              if (
                pct &&
                !isNaN(pct) &&
                pct >= 14 &&
                pct <= 45 &&
                typeof window !== "undefined"
              ) {
                localStorage.setItem("code_editor_sidebar_size", pct.toFixed(1));
                // Prompt Monaco and terminal to recalculate bounds
                window.dispatchEvent(new Event("resize"));
              }
            }}
            className="h-full min-w-0 bg-sidebar border-r border-border overflow-hidden select-none"
          >
            <TemplateFileTree
              data={templateData}
              title="File Explorer"
              onFileSelect={handleFileSelect}
              selectedFile={activeFile}
              onAddFile={(file, parentPath) =>
                handleAddFile(file, parentPath, async () => {}, null, saveTemplateData)
              }
              onAddFolder={(folder, parentPath) =>
                handleAddFolder(folder, parentPath, null, saveTemplateData)
              }
              onDeleteFile={(file, parentPath) =>
                handleDeleteFile(file, parentPath, saveTemplateData)
              }
              onDeleteFolder={(folder, parentPath) =>
                handleDeleteFolder(folder, parentPath, saveTemplateData)
              }
              onRenameFile={(file, newFilename, newExtension, parentPath) =>
                handleRenameFile(file, newFilename, newExtension, parentPath, saveTemplateData)
              }
              onRenameFolder={(folder, newFolderName, parentPath) =>
                handleRenameFolder(folder, newFolderName, parentPath, saveTemplateData)
              }
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Main Area */}
          <ResizablePanel
            defaultSize={`${100 - sidebarDefaultSize}%`}
            minSize="55%"
            className="h-full min-w-0 flex flex-col overflow-hidden"
          >
            <SidebarInset className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
              {/* Header */}
              <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background">
                {/* Sidebar Toggle */}
                <SidebarTrigger
                  onClick={() => {
                    const panel = sidebarPanelRef.current;
                    if (panel) {
                      if (panel.isCollapsed()) {
                        panel.expand();
                      } else {
                        panel.collapse();
                      }
                    }
                  }}
                  className="-ml-1"
                />

                {/* Back and Forward Navigation */}
                <div className="flex items-center gap-0.5 ml-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => router.back()}
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>Back</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => router.forward()}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>Forward</TooltipContent>
                  </Tooltip>
                </div>

                <Separator orientation="vertical" className="mx-2 h-4" />

                <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <h1 className="text-sm font-semibold truncate">
                      {currentPlayground?.title || playgroundData?.title || "Code Playground"}
                    </h1>

                    <p className="text-[11px] text-muted-foreground truncate">
                      {openFiles.length} File(s) Open
                      {hasUnsavedChanges && " - Unsaved Changes"}
                    </p>
                  </div>

                  {/* Center/Right Action Bar */}
                  <div className="flex items-center gap-2">
                    <ExecutionActionBar
                      template={activeTemplate}
                      onRun={handleRun}
                      onStop={handleStop}
                      onSelectTemplate={handleLanguageSwitch}
                    />

                    <Separator orientation="vertical" className="h-4 mx-1" />

                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSave}
                            disabled={!activeFile || !activeFile.hasUnsavedChanges}
                            className="h-8 px-2.5"
                          >
                            <Save className="size-3.5" />
                          </Button>
                        }
                      />
                      <TooltipContent>Save (Ctrl + S)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges}
                            className="h-8 px-2.5 text-xs"
                          >
                            <Save className="size-3.5 mr-1" />
                            All
                          </Button>
                        }
                      />
                      <TooltipContent>Save All (Ctrl + Shift + S)</TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                            <Settings className="size-3.5" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setTerminalVisible(!isTerminalVisible)}
                        >
                          {isTerminalVisible ? "Hide" : "Show"} Terminal Panel
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={closeAllFiles}>
                          Close All Files
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </header>

              {/* Main Content Area */}
              <div className="flex-1 overflow-hidden">
                {openFiles.length > 0 ? (
                  <div className="flex h-full flex-col">
                    {/* Editor Tabs */}
                    <div className="border-b bg-muted/30">
                      <Tabs
                        value={activeFileId || ""}
                        onValueChange={setActiveFileId}
                      >
                        <div className="flex items-center justify-between px-4 py-1.5">
                          <TabsList className="h-7 bg-transparent p-0">
                            {openFiles.map((file) => (
                              <TabsTrigger
                                key={file.id}
                                value={file.id}
                                className="group relative h-7 px-3 text-xs data-[state=active]:bg-accent data-[state=active]:shadow-sm"
                              >
                                <div className="flex items-center gap-1.5">
                                  <FileText className="size-3 text-muted-foreground" />

                                  <span>
                                    {file.filename}
                                    {file.fileExtension
                                      ? `.${file.fileExtension}`
                                      : ""}
                                  </span>

                                  {file.hasUnsavedChanges && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  )}

                                  <span
                                    className="ml-1.5 flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-sm opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      closeFile(file.id);
                                    }}
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </span>
                                </div>
                              </TabsTrigger>
                            ))}
                          </TabsList>

                          {openFiles.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={closeAllFiles}
                              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                            >
                              Close All
                            </Button>
                          )}
                        </div>
                      </Tabs>
                    </div>

                    {/* Editor + Terminal Resizable Panels */}
                    <div className="flex-1 overflow-hidden">
                      {/* @ts-ignore */}
                      <ResizablePanelGroup
                        direction="vertical"
                        className="h-full"
                      >
                        {/* Top Panel: Monaco Editor */}
                        <ResizablePanel
                          defaultSize={isTerminalVisible ? "65%" : "100%"}
                          minSize="25%"
                        >
                          <PlaygroundEditor
                            activeFile={activeFile}
                            Content={activeFile?.content || ""}
                            onContentChange={(value) =>
                              activeFileId && updateFileContent(activeFileId, value)
                            }
                          />
                        </ResizablePanel>

                        {/* Bottom Panel: Terminal & Preview */}
                        {isTerminalVisible && (
                          <>
                            <ResizableHandle withHandle />
                            <ResizablePanel
                              defaultSize="35%"
                              minSize="15%"
                              onResize={() => {
                                if (typeof window !== "undefined") {
                                  window.dispatchEvent(new Event("resize"));
                                }
                              }}
                            >
                              <div className="flex flex-col h-full bg-[#0D1117]">
                                {/* Bottom Panel Tab Switcher */}
                                {isWebTemplate && (
                                  <div className="flex items-center justify-between px-3 py-1 bg-[#161B22] border-b border-zinc-800 text-xs">
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => setActiveBottomTab("terminal")}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                          activeBottomTab === "terminal"
                                            ? "bg-zinc-800 text-white"
                                            : "text-zinc-400 hover:text-zinc-200"
                                        }`}
                                      >
                                        <TerminalIcon className="size-3" />
                                        Terminal
                                      </button>

                                      <button
                                        onClick={() => setActiveBottomTab("preview")}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                          activeBottomTab === "preview"
                                            ? "bg-zinc-800 text-white"
                                            : "text-zinc-400 hover:text-zinc-200"
                                        }`}
                                      >
                                        <Globe className="size-3" />
                                        Browser Preview
                                        {previewUrl && (
                                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        )}
                                      </button>
                                    </div>

                                  </div>
                                )}

                                {/* Panel Content */}
                                <div className="flex-1 relative overflow-hidden">
                                  {/* Terminal */}
                                  <div
                                    className={`h-full w-full ${
                                      activeBottomTab === "terminal" ? "block" : "hidden"
                                    }`}
                                  >
                                    <PlaygroundTerminal
                                      template={activeTemplate}
                                      terminalRef={terminalRef}
                                      onInput={handleTerminalInput}
                                      onRun={handleRun}
                                      onStop={handleStop}
                                      onCommand={handleTerminalCommand}
                                    />
                                  </div>

                                  {/* Preview Tab (Web templates only) */}
                                  {isWebTemplate && (
                                    <div
                                      className={`h-full w-full bg-zinc-950 flex flex-col ${
                                        activeBottomTab === "preview" ? "flex" : "hidden"
                                      }`}
                                    >
                                      {previewUrl ? (
                                        <>
                                          {/* Browser Preview Address Bar */}
                                          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0D1117] border-b border-zinc-800/80 text-xs gap-2 shrink-0">
                                            <div className="flex items-center gap-1.5">
                                              <button
                                                onClick={handleRefreshPreview}
                                                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                                title="Reload preview"
                                              >
                                                <RotateCw className="size-3.5" />
                                              </button>
                                            </div>

                                            <div className="flex-1 max-w-lg mx-2 flex items-center bg-[#161B22] border border-zinc-800 rounded-md px-2.5 py-1 text-xs text-zinc-300 font-mono">
                                              <span className="size-2 rounded-full mr-2 shrink-0 bg-emerald-400 animate-pulse" />
                                              <span className="truncate flex-1 select-all text-[11px]">
                                                {previewUrl}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                              <button
                                                onClick={handleCopyPreviewUrl}
                                                className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-[11px]"
                                                title="Copy preview URL"
                                              >
                                                {isCopied ? (
                                                  <>
                                                    <Check className="size-3 text-emerald-400" />
                                                    <span className="text-emerald-400">Copied</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Copy className="size-3" />
                                                    <span>Copy</span>
                                                  </>
                                                )}
                                              </button>

                                              <button
                                                onClick={handleOpenInNewTab}
                                                className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-[11px]"
                                                title="Open preview in new browser tab"
                                              >
                                                <span>Open in new tab</span>
                                                <ExternalLink className="size-3" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Embedded Iframe */}
                                          <div className="flex-1 w-full h-full relative overflow-hidden">
                                            <iframe
                                              key={previewKey}
                                              ref={previewIframeRef}
                                              src={previewUrl}
                                              className="w-full h-full border-0 bg-white"
                                              title="Application Preview"
                                              sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
                                            />
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-zinc-500 text-xs">
                                          <Globe className="size-8 text-zinc-600 animate-pulse" />
                                          <p className="font-medium text-zinc-400">Development server is not running.</p>
                                          <p className="text-[11px] text-zinc-600">
                                            Click "Run" in the top bar to launch the application and preview it here.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </ResizablePanel>
                          </>
                        )}
                      </ResizablePanelGroup>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                    <FileText className="size-16 text-gray-300" />

                    <div className="text-center">
                      <p className="text-lg font-medium">No open files</p>
                      <p className="text-sm">
                        Select a file from the sidebar to start editing.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </SidebarInset>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  );
};

export default Page;
