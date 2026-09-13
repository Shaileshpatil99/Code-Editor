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

import { useParams } from "next/navigation";
import React from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { FileText, Save, X, Settings, Bot } from "lucide-react";

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

const Page = () => {
  const { id } = useParams<{ id: string }>();

  const [isPreviewVisible, setPreviewVisible] = React.useState(true);

  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);

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

  React.useEffect(() => {
    if (templateData) {
      setTemplateData(templateData);
    }

    if (id) {
      setPlaygroundId(id);
    }
  }, [templateData, id, setTemplateData, setPlaygroundId]);

  const activeFile = openFiles.find((file) => file.id === activeFileId);

  const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges);

  const handleFileSelect = (file: TemplateFile) => {
    openFile(file);
  };

  return (
    <>
      <TemplateFileTree
        data={templateData}
        onFileSelect={handleFileSelect}
        selectedFile={activeFile}
      />

      <TooltipProvider>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />

            <Separator orientation="vertical" className="mr-2 h-4" />

            <div className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 flex-col">
                <h1 className="text-sm font-medium">
                  {playgroundData?.title || "Code Playground"}
                </h1>

                <p className="text-xs text-muted-foreground">
                  {openFiles.length} File(s) Open
                  {hasUnsavedChanges && " - Unsaved Changes"}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {}}
                        disabled={!activeFile || !activeFile.hasUnsavedChanges}
                      >
                        <Save className="size-4" />
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
                        onClick={() => {}}
                        disabled={!hasUnsavedChanges}
                      >
                        <Save className="h-4 w-4" />
                        All
                      </Button>
                    }
                  />

                  <TooltipContent>Save All (Ctrl + Shift + S)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button size="sm" variant="outline" onClick={() => {}}>
                        <Bot className="h-4 w-4" />
                        TOGGLE AI
                      </Button>
                    }
                  />

                  <TooltipContent>
                    Toggle AI Assistant (Ctrl + Alt + A)
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button size="sm" variant="outline">
                        <Settings className="size-4" />
                      </Button>
                    }
                  />

                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => setPreviewVisible(!isPreviewVisible)}
                    >
                      {isPreviewVisible ? "Hide" : "Show"} Preview
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

          <div className="h-[calc(100vh-4rem)]">
            {openFiles.length > 0 ? (
              <div className="flex h-full flex-col">
                <div className="border-b bg-muted/30">
                  <Tabs
                    value={activeFileId || ""}
                    onValueChange={setActiveFileId}
                  >
                    <div className="flex items-center justify-between px-4 py-2">
                      <TabsList className="h-8 bg-transparent p-0">
                        {openFiles.map((file) => (
                          <TabsTrigger
                            key={file.id}
                            value={file.id}
                            className="group relative h-8 px-3 data-[state=active]:bg-accent data-[state=active]:shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="size-3" />

                              <span>
                                {file.filename}
                                {file.fileExtension
                                  ? `.${file.fileExtension}`
                                  : ""}
                              </span>

                              {file.hasUnsavedChanges && (
                                <span className="h-2 w-2 rounded-full bg-orange-500" />
                              )}

                              <span
                                className="ml-2 flex h-4 w-4 cursor-pointer items-center justify-center rounded-sm opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeFile(file.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {openFiles.length > 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={closeAllFiles}
                          className="h-6 px-2 text-xs"
                        >
                          Close All
                        </Button>
                      )}
                    </div>
                  </Tabs>
                </div>
                     
                <div className="flex-1 overflow-auto">
                  
                  <ResizablePanelGroup
                   // @ts-ignore
                    direction="horizontal"
                    className="h-full "
                  >
                    <ResizablePanel defaultSize={isPreviewVisible ? 50 : 100}>
                      <PlaygroundEditor
                        activeFile={activeFile}
                        Content={activeFile?.content || ""}
                        onContentChange={(value) =>
                          activeFileId && updateFileContent(activeFileId, value)
                        }
                      />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                <FileText className="size-16 text-gray-300" />

                <div className="text-center">
                  <p className="text-lg font-medium">No open files</p>

                  <p className="text-sm">
                    Select a file from a sidebar to start editing.
                  </p>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </TooltipProvider>
    </>
  );
};

export default Page;
