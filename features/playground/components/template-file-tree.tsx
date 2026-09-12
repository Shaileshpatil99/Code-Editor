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
  X,
  AlertTriangle,
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

// -------------------------------------------------------------
// Tree Helper Functions (ensures instant sidebar reactivity)
// -------------------------------------------------------------

function isSameItem(a: TemplateItem, b: TemplateItem) {
  if ("filename" in a && "filename" in b) {
    return a.filename === b.filename && a.fileExtension === b.fileExtension;
  }
  if ("folderName" in a && "folderName" in b) {
    return a.folderName === b.folderName;
  }
  return false;
}

function addItemToTree(
  tree: TemplateItem,
  newItem: TemplateItem,
  targetPath: string,
  currentPath = "",
): TemplateItem {
  if (!tree || !("folderName" in tree)) return tree;

  if (targetPath === "") {
    return {
      ...tree,
      items: [...(tree.items || []), newItem],
    };
  }

  return {
    ...tree,
    items: (tree.items || []).map((child) => {
      if ("folderName" in child) {
        const childPath = currentPath
          ? `${currentPath}/${child.folderName}`
          : child.folderName;

        if (childPath === targetPath) {
          return {
            ...child,
            items: [...(child.items || []), newItem],
          };
        }

        return addItemToTree(child, newItem, targetPath, childPath);
      }
      return child;
    }),
  };
}

function removeItemFromTree(
  tree: TemplateItem,
  targetItem: TemplateItem,
  parentPath: string,
  currentPath = "",
): TemplateItem {
  if (!tree || !("folderName" in tree)) return tree;

  if (parentPath === "") {
    return {
      ...tree,
      items: (tree.items || []).filter(
        (child) => !isSameItem(child, targetItem),
      ),
    };
  }

  return {
    ...tree,
    items: (tree.items || []).map((child) => {
      if ("folderName" in child) {
        const childPath = currentPath
          ? `${currentPath}/${child.folderName}`
          : child.folderName;

        if (childPath === parentPath) {
          return {
            ...child,
            items: (child.items || []).filter(
              (item) => !isSameItem(item, targetItem),
            ),
          };
        }

        return removeItemFromTree(child, targetItem, parentPath, childPath);
      }
      return child;
    }),
  };
}

function renameItemInTree(
  tree: TemplateItem,
  targetItem: TemplateItem,
  updatedItem: TemplateItem,
  parentPath: string,
  currentPath = "",
): TemplateItem {
  if (!tree || !("folderName" in tree)) return tree;

  if (parentPath === "") {
    return {
      ...tree,
      items: (tree.items || []).map((child) =>
        isSameItem(child, targetItem) ? updatedItem : child,
      ),
    };
  }

  return {
    ...tree,
    items: (tree.items || []).map((child) => {
      if ("folderName" in child) {
        const childPath = currentPath
          ? `${currentPath}/${child.folderName}`
          : child.folderName;

        if (childPath === parentPath) {
          return {
            ...child,
            items: (child.items || []).map((item) =>
              isSameItem(item, targetItem) ? updatedItem : item,
            ),
          };
        }

        return renameItemInTree(
          child,
          targetItem,
          updatedItem,
          parentPath,
          childPath,
        );
      }
      return child;
    }),
  };
}

// -------------------------------------------------------------
// 1. New File Dialog
// -------------------------------------------------------------

interface NewFileDialogProps {
  isOpen: boolean;
  onCreate: (filename: string, fileExtension: string) => void;
  onClose: () => void;
}

const COMMON_EXTENSIONS = [
  "js",
  "ts",
  "jsx",
  "tsx",
  "json",
  "html",
  "css",
  "py",
  "md",
];

const NewFileDialog: React.FC<NewFileDialogProps> = ({
  isOpen,
  onCreate,
  onClose,
}) => {
  const [filename, setFilename] = React.useState("");
  const [fileExtension, setFileExtension] = React.useState("js");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setFilename("");
      setFileExtension("js");
      setIsDropdownOpen(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim()) return;

    let cleanName = filename.trim();
    let cleanExt = fileExtension.trim().replace(/^\./, "");

    const lastDot = cleanName.lastIndexOf(".");
    if (lastDot > 0) {
      cleanExt = cleanName.substring(lastDot + 1);
      cleanName = cleanName.substring(0, lastDot);
    }

    onCreate(cleanName, cleanExt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Create New File
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Enter a name for the new file and select its extension.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="filename-input"
              className="w-20 text-sm font-medium text-zinc-300 shrink-0"
            >
              Filename
            </label>
            <input
              id="filename-input"
              ref={inputRef}
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="main"
              className="flex-1 rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div className="flex items-center gap-4 relative" ref={dropdownRef}>
            <label
              htmlFor="extension-input"
              className="w-20 text-sm font-medium text-zinc-300 shrink-0"
            >
              Extension
            </label>
            <div className="relative flex-1">
              <input
                id="extension-input"
                type="text"
                value={fileExtension}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => setFileExtension(e.target.value)}
                placeholder="js"
                className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />

              {isDropdownOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1">
                  {COMMON_EXTENSIONS.map((ext) => (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => {
                        setFileExtension(ext);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      {ext}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!filename.trim()}
              className="rounded-lg bg-zinc-200 px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. New Folder Dialog
// -------------------------------------------------------------

interface NewFolderDialogProps {
  isOpen: boolean;
  onCreate: (folderName: string) => void;
  onClose: () => void;
}

const NewFolderDialog: React.FC<NewFolderDialogProps> = ({
  isOpen,
  onCreate,
  onClose,
}) => {
  const [folderName, setFolderName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setFolderName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    onCreate(folderName.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Create New Folder
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Enter a name for the new folder.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="folder-name-input"
              className="w-24 text-sm font-medium text-zinc-300 shrink-0"
            >
              Folder Name
            </label>
            <input
              id="folder-name-input"
              ref={inputRef}
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="new-folder"
              className="flex-1 rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="rounded-lg bg-zinc-200 px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. Rename Dialog
// -------------------------------------------------------------

interface RenameDialogProps {
  isOpen: boolean;
  initialValue: string;
  itemType: "file" | "folder";
  onRename: (newName: string) => void;
  onClose: () => void;
}

const RenameDialog: React.FC<RenameDialogProps> = ({
  isOpen,
  initialValue,
  itemType,
  onRename,
  onClose,
}) => {
  const [name, setName] = React.useState(initialValue);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName(initialValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onRename(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Rename {itemType === "file" ? "File" : "Folder"}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Enter a new name for this {itemType}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="rename-input"
              className="w-20 text-sm font-medium text-zinc-300 shrink-0"
            >
              Name
            </label>
            <input
              id="rename-input"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || name === initialValue}
              className="rounded-lg bg-zinc-200 px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. Delete Confirmation Dialog
// -------------------------------------------------------------

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  itemName: string;
  itemType: "file" | "folder";
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  itemName,
  itemType,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Delete {itemType === "file" ? "File" : "Folder"}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-medium text-zinc-200">"{itemName}"</span>?
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors shadow-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Template Node
// -------------------------------------------------------------

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
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = React.useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] =
    React.useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(true);

  if (!item || typeof item !== "object") {
    return null;
  }

  const isFolder = "folderName" in item;

  if (isFolder) {
    const folder = item as TemplateFolder;

    const currentPath = path
      ? `${path}/${folder.folderName}`
      : folder.folderName;

    const handleCreateFile = (filename: string, fileExtension: string) => {
      const newFile: TemplateFile = {
        filename,
        fileExtension,
        content: "",
      };
      onAddFile?.(newFile, currentPath);
      setIsOpen(true);
    };

    const handleCreateFolder = (folderName: string) => {
      const newFolder: TemplateFolder = {
        folderName,
        items: [],
      };
      onAddFolder?.(newFolder, currentPath);
      setIsOpen(true);
    };

    const handleConfirmRename = (newName: string) => {
      onRenameFolder?.(folder, newName, path);
    };

    const handleConfirmDelete = () => {
      onDeleteFolder?.(folder, path);
    };

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <div
          className="flex w-full items-center gap-1"
          style={{
            paddingLeft: `${level * 12 + 4}px`,
          }}
        >
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
              <DropdownMenuItem onClick={() => setIsNewFileDialogOpen(true)}>
                <FilePlus className="mr-2 h-4 w-4" />
                New File
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setIsNewFolderDialogOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Dialogs for Folder */}
        <NewFileDialog
          isOpen={isNewFileDialogOpen}
          onClose={() => setIsNewFileDialogOpen(false)}
          onCreate={handleCreateFile}
        />

        <NewFolderDialog
          isOpen={isNewFolderDialogOpen}
          onClose={() => setIsNewFolderDialogOpen(false)}
          onCreate={handleCreateFolder}
        />

        <RenameDialog
          isOpen={isRenameDialogOpen}
          initialValue={folder.folderName}
          itemType="folder"
          onRename={handleConfirmRename}
          onClose={() => setIsRenameDialogOpen(false)}
        />

        <DeleteConfirmDialog
          isOpen={isDeleteDialogOpen}
          itemName={folder.folderName}
          itemType="folder"
          onConfirm={handleConfirmDelete}
          onClose={() => setIsDeleteDialogOpen(false)}
        />

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

  const handleConfirmRename = (newName: string) => {
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

  const handleConfirmDelete = () => {
    onDeleteFile?.(file, path);
  };

  return (
    <div
      className="flex w-full items-center gap-1"
      style={{
        paddingLeft: `${level * 12 + 4}px`,
      }}
    >
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
          <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs for File */}
      <RenameDialog
        isOpen={isRenameDialogOpen}
        initialValue={fullFileName}
        itemType="file"
        onRename={handleConfirmRename}
        onClose={() => setIsRenameDialogOpen(false)}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        itemName={fullFileName}
        itemType="file"
        onConfirm={handleConfirmDelete}
        onClose={() => setIsDeleteDialogOpen(false)}
      />
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
  const [treeData, setTreeData] = React.useState<TemplateItem | null>(data);
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = React.useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] =
    React.useState(false);

  React.useEffect(() => {
    setTreeData(data);
  }, [data]);

  if (!treeData) {
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
    typeof treeData === "object" &&
    treeData !== null &&
    "folderName" in treeData;

  // Handlers that update local UI immediately AND call parent callbacks
  const handleAddFileInternal = (file: TemplateFile, parentPath: string) => {
    setTreeData((prev) =>
      prev ? addItemToTree(prev, file, parentPath) : prev,
    );
    onAddFile?.(file, parentPath);
  };

  const handleAddFolderInternal = (
    folder: TemplateFolder,
    parentPath: string,
  ) => {
    setTreeData((prev) =>
      prev ? addItemToTree(prev, folder, parentPath) : prev,
    );
    onAddFolder?.(folder, parentPath);
  };

  const handleDeleteFileInternal = (file: TemplateFile, parentPath: string) => {
    setTreeData((prev) =>
      prev ? removeItemFromTree(prev, file, parentPath) : prev,
    );
    onDeleteFile?.(file, parentPath);
  };

  const handleDeleteFolderInternal = (
    folder: TemplateFolder,
    parentPath: string,
  ) => {
    setTreeData((prev) =>
      prev ? removeItemFromTree(prev, folder, parentPath) : prev,
    );
    onDeleteFolder?.(folder, parentPath);
  };

  const handleRenameFileInternal = (
    file: TemplateFile,
    newFilename: string,
    newExtension: string,
    parentPath: string,
  ) => {
    const updatedFile: TemplateFile = {
      ...file,
      filename: newFilename,
      fileExtension: newExtension,
    };
    setTreeData((prev) =>
      prev ? renameItemInTree(prev, file, updatedFile, parentPath) : prev,
    );
    onRenameFile?.(file, newFilename, newExtension, parentPath);
  };

  const handleRenameFolderInternal = (
    folder: TemplateFolder,
    newFolderName: string,
    parentPath: string,
  ) => {
    const updatedFolder: TemplateFolder = {
      ...folder,
      folderName: newFolderName,
    };
    setTreeData((prev) =>
      prev ? renameItemInTree(prev, folder, updatedFolder, parentPath) : prev,
    );
    onRenameFolder?.(folder, newFolderName, parentPath);
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
              <DropdownMenuItem onClick={() => setIsNewFileDialogOpen(true)}>
                <FilePlus className="mr-2 h-4 w-4" />
                New File
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setIsNewFolderDialogOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* FILE TREE */}
          <SidebarGroupContent>
            <div className="w-full">
              {isRootFolder ? (
                (treeData as TemplateFolder).items.map((child, index) => (
                  <TemplateNode
                    key={`root-${index}`}
                    item={child}
                    onFileSelect={onFileSelect}
                    selectedFile={selectedFile}
                    level={0}
                    path=""
                    onAddFile={handleAddFileInternal}
                    onAddFolder={handleAddFolderInternal}
                    onDeleteFile={handleDeleteFileInternal}
                    onDeleteFolder={handleDeleteFolderInternal}
                    onRenameFile={handleRenameFileInternal}
                    onRenameFolder={handleRenameFolderInternal}
                  />
                ))
              ) : (
                <TemplateNode
                  item={treeData}
                  onFileSelect={onFileSelect}
                  selectedFile={selectedFile}
                  level={0}
                  path=""
                  onAddFile={handleAddFileInternal}
                  onAddFolder={handleAddFolderInternal}
                  onDeleteFile={handleDeleteFileInternal}
                  onDeleteFolder={handleDeleteFolderInternal}
                  onRenameFile={handleRenameFileInternal}
                  onRenameFolder={handleRenameFolderInternal}
                />
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Root Dialogs */}
      <NewFileDialog
        isOpen={isNewFileDialogOpen}
        onClose={() => setIsNewFileDialogOpen(false)}
        onCreate={(filename, fileExtension) =>
          handleAddFileInternal({ filename, fileExtension, content: "" }, "")
        }
      />

      <NewFolderDialog
        isOpen={isNewFolderDialogOpen}
        onClose={() => setIsNewFolderDialogOpen(false)}
        onCreate={(folderName) =>
          handleAddFolderInternal({ folderName, items: [] }, "")
        }
      />
    </Sidebar>
  );
};

export default TemplateFileTree;
