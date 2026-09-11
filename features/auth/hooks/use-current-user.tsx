"use client";

import * as React from "react";
import {
  Plus,
  FilePlus,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type {
  TemplateFile,
  TemplateFolder,
  TemplateItem,
} from "../lib/path-to-json";

interface TemplateFileTreeProps { 
  data: TemplateItem | null;

  onFileSelect?: (file: TemplateFile) => void;
  selectedFile?: TemplateFile;
  title?: string;

  onAddFile?: (file: TemplateFile, parentPath: string) => void;

  onAddFolder?: (folder: TemplateFolder, parentPath: string) => void;

  onDeleteFile?: (file: TemplateFile, parentPath: string) => void;

  onDeleteFolder?: (folder: TemplateFolder, parentPath: string) => void;

  onRenameFile?: (
    file: TemplateFile,
    newFilename: string,
    newExtension: string,
    parentPath: string,
  ) => void;

  onRenameFolder?: (
    folder: TemplateFolder,
    newFolderName: string,
    parentPath: string,
  ) => void;
}

interface TemplateNodeProps {
  item: TemplateItem | null;

  onFileSelect?: (file: TemplateFile) => void;
  selectedFile?: TemplateFile;

  level: number;
  path: string;

  onAddFile?: (file: TemplateFile, parentPath: string) => void;

  onAddFolder?: (folder: TemplateFolder, parentPath: string) => void;

  onDeleteFile?: (file: TemplateFile, parentPath: string) => void;

  onDeleteFolder?: (folder: TemplateFolder, parentPath: string) => void;

  onRenameFile?: (
    file: TemplateFile,
    newFilename: string,
    newExtension: string,
    parentPath: string,
  ) => void;

  onRenameFolder?: (
    folder: TemplateFolder,
    newFolderName: string,
    parentPath: string,
  ) => void;
} 

const TemplateNode = ({
  item,
  onFileSelect,
  selectedFile,
  level,
  path,
  onAddFile,
  onAddFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onRenameFolder,
}: TemplateNodeProps) => {
      const isRootFolder = item && typeof item === "object" && "folderName" in item;
      const [isNewFileDialogOpen, setIsNewFileDialog] = React.useState(false);
      const [isNewFolderDialogOpen, setIsNewFolderDialog] = React.useState(false);

      const handleRootNewFile = () => {
        setIsNewFileDialog(true);
      }
      const handleRootNewFolder = () => {
        setIsNewFolderDialog(true);
      }


  if (!item || typeof item !== "object") {
    return null;
  }

  const isFolder = "folderName" in item;

  if (isFolder) {
    const folder = item as TemplateFolder;

    const currentPath = path
      ? `${path}/${folder.folderName}`
      : folder.folderName;

    const handleRenameFolder = () => {
      const newName = window.prompt(
        "Enter new folder name:",
        folder.folderName,
      );

      if (!newName || !newName.trim()) {
        return;
      }

      onRenameFolder?.(folder, newName.trim(), path);
    };

    const handleDeleteFolder = () => {
      const confirmed = window.confirm(
        `Are you sure you want to delete folder "${folder.folderName}"?`,
      );

      if (!confirmed) {
        return;
      }

      onDeleteFolder?.(folder, path);
    };

    const handleAddFile = () => {
      const fileName = window.prompt("Enter file name:", "new-file");

      if (!fileName || !fileName.trim()) {
        return;
      }

      const cleanName = fileName.trim();

      const lastDot = cleanName.lastIndexOf(".");

      let filename = cleanName;
      let fileExtension = "";

      if (lastDot > 0) {
        filename = cleanName.substring(0, lastDot);

        fileExtension = cleanName.substring(lastDot + 1);
      }

      const newFile: TemplateFile = {
        filename,
        fileExtension,
        content: "",
      };

      onAddFile?.(newFile, currentPath);
    };

    const handleAddFolder = () => {
      const folderName = window.prompt("Enter folder name:", "new-folder");

      if (!folderName || !folderName.trim()) {
        return;
      }

      const newFolder: TemplateFolder = {
        folderName: folderName.trim(),
        items: [],
      };

      onAddFolder?.(newFolder, currentPath);
    };

    return (
      <Collapsible defaultOpen className="w-full">
        <div
          className="flex w-full items-center gap-1"
          style={{
            paddingLeft: `${level * 12 + 4}px`,
          }}
        >
          {/* IMPORTANT:
              Only this button controls collapse
          */}

          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="group flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm"
              />
            }
          >
            <ChevronRight className="h-4 w-4 shrink-0 rotate-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />

            <span>📁</span>

            <span className="truncate">{folder.folderName}</span>
          </CollapsibleTrigger>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAddFile}>
                <FilePlus className="mr-2 h-4 w-4" />
                New File
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleAddFolder}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleRenameFolder}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleDeleteFolder}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CollapsibleContent>
          {Array.isArray(folder.items) &&
            folder.items.map((child, index) => (
              <TemplateNode
                key={`${currentPath}/${index}`}
                item={child}
                onFileSelect={onFileSelect}
                selectedFile={selectedFile}
                level={level + 1}
                path={currentPath}
                onAddFile={onAddFile}
                onAddFolder={onAddFolder}
                onDeleteFile={onDeleteFile}
                onDeleteFolder={onDeleteFolder}
                onRenameFile={onRenameFile}
                onRenameFolder={onRenameFolder}
              />
            ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  const file = item as TemplateFile;

  const isSelected =
    selectedFile?.filename === file.filename &&
    selectedFile?.fileExtension === file.fileExtension;

  const fullFileName = file.fileExtension
    ? `${file.filename}.${file.fileExtension}`
    : file.filename;

  // Rename file
  const handleRenameFile = () => {
    const newName = window.prompt("Enter new file name:", fullFileName);

    if (!newName || !newName.trim()) {
      return;
    }

    const cleanName = newName.trim();

    const lastDot = cleanName.lastIndexOf(".");

    let newFilename = cleanName;
    let newExtension = "";

    if (lastDot > 0) {
      newFilename = cleanName.substring(0, lastDot);

      newExtension = cleanName.substring(lastDot + 1);
    }

    onRenameFile?.(file, newFilename, newExtension, path);
  };

  // Delete file
  const handleDeleteFile = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${fullFileName}"?`,
    );

    if (!confirmed) {
      return;
    }

    onDeleteFile?.(file, path);
  };

  return (
    <div
      className="flex w-full items-center gap-1"
      style={{
        paddingLeft: `${level * 12 + 4}px`,
      }}
    >
      {/* FILE */}

      <button
        type="button"
        onClick={() => onFileSelect?.(file)}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm ${
          isSelected ? "bg-accent" : ""
        }`}
      >
        <span>📄</span>

        <span className="truncate">{fullFileName}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            />
          }
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleRenameFile}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleDeleteFile}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const TemplateFileTree = ({
  data,
  onFileSelect,
  selectedFile,
  title = "File Explorer",

  onAddFile,
  onAddFolder,

  onDeleteFile,
  onDeleteFolder,

  onRenameFile,
  onRenameFolder,
}: TemplateFileTreeProps) => {
  // Loading state
  if (!data) {
    return (
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{title}</SidebarGroupLabel>

            <SidebarGroupContent>
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Loading files...
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  const isRootFolder =
    typeof data === "object" && data !== null && "folderName" in data;

  const handleNewFile = () => {
    const fileName = window.prompt("Enter file name:", "new-file");

    if (!fileName || !fileName.trim()) {
      return;
    }

    const cleanName = fileName.trim();

    const lastDot = cleanName.lastIndexOf(".");

    let filename = cleanName;
    let fileExtension = "";

    if (lastDot > 0) {
      filename = cleanName.substring(0, lastDot);

      fileExtension = cleanName.substring(lastDot + 1);
    }

    const newFile: TemplateFile = {
      filename,
      fileExtension,
      content: "",
    };

    onAddFile?.(newFile, "");
  };

  const handleNewFolder = () => {
    const folderName = window.prompt("Enter folder name:", "new-folder");

    if (!folderName || !folderName.trim()) {
      return;
    }

    const newFolder: TemplateFolder = {
      folderName: folderName.trim(),
      items: [],
    };

    onAddFolder?.(newFolder, "");
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          {/* HEADER */}

          <SidebarGroupLabel>{title}</SidebarGroupLabel>

          {/* ADD BUTTON */}

          <DropdownMenu>
            <DropdownMenuTrigger render={<SidebarGroupAction />}>
              <Plus className="h-4 w-4" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleNewFile}>
                <FilePlus className="mr-2 h-4 w-4" />
                New File
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleNewFolder}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* FILE TREE */}

          <SidebarGroupContent>
            <div className="w-full">
              {isRootFolder ? (
                (data as TemplateFolder).items.map((child, index) => (
                  <TemplateNode
                    key={`root-${index}`}
                    item={child}
                    onFileSelect={onFileSelect}
                    selectedFile={selectedFile}
                    level={0}
                    path=""
                    onAddFile={onAddFile}
                    onAddFolder={onAddFolder}
                    onDeleteFile={onDeleteFile}
                    onDeleteFolder={onDeleteFolder}
                    onRenameFile={onRenameFile}
                    onRenameFolder={onRenameFolder}
                  />
                ))
              ) : (
                <TemplateNode
                  item={data}
                  onFileSelect={onFileSelect}
                  selectedFile={selectedFile}
                  level={0}
                  path=""
                  onAddFile={onAddFile}
                  onAddFolder={onAddFolder}
                  onDeleteFile={onDeleteFile}
                  onDeleteFolder={onDeleteFolder}
                  onRenameFile={onRenameFile}
                  onRenameFolder={onRenameFolder}
                />
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default TemplateFileTree;

interface NewFileDialogProps {
  isOpen: boolean;
  onCreate: (filename: string, fileExtension: string) => void;
  onClose: () => void;
}


