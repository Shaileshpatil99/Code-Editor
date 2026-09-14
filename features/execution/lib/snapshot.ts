import { TemplateFolder, TemplateFile } from "@/features/playground/types";
import { OpenFile } from "@/features/playground/types";
import { findFilePath } from "@/features/playground/lib";

export interface ProjectSnapshot {
  files: Record<string, string>;
  sourceFiles: string[];
  activeFilePath?: string;
  folderTree: TemplateFolder;
}

export function createProjectSnapshot(
  rootFolder: TemplateFolder | null,
  openFiles: OpenFile[],
  activeFileId: string | null
): ProjectSnapshot {
  if (!rootFolder) {
    return {
      files: {},
      sourceFiles: [],
      folderTree: { folderName: "Root", items: [] },
    };
  }

  // Deep clone root folder to avoid mutating store state
  const clonedTree: TemplateFolder = JSON.parse(JSON.stringify(rootFolder));

  // Build a lookup map of open files latest content: filePath -> content
  const openFileContentMap = new Map<string, string>();
  let activeFilePath: string | undefined;

  for (const openFile of openFiles) {
    const ext = openFile.fileExtension ? `.${openFile.fileExtension}` : "";
    const defaultName = `${openFile.filename}${ext}`;
    const foundPath = findFilePath(openFile, rootFolder)?.replace(/^\/+/, "");
    const filePath = (foundPath || openFile.id || defaultName).replace(/^\/+/, "");

    if (filePath) {
      openFileContentMap.set(filePath, openFile.content);
      if (defaultName && defaultName !== filePath) {
        openFileContentMap.set(defaultName, openFile.content);
      }
      if (
        openFile.id === activeFileId ||
        filePath === activeFileId ||
        defaultName === activeFileId ||
        (activeFileId && activeFileId.replace(/^\/+/, "") === filePath) ||
        (activeFileId && activeFileId.replace(/^\/+/, "") === defaultName)
      ) {
        activeFilePath = filePath;
      }
    }
  }

  // Fallback: if activeFilePath was not found in openFiles, resolve activeFileId directly
  if (!activeFilePath && activeFileId) {
    activeFilePath = activeFileId.replace(/^\/+/, "");
  }

  const flattenedFiles: Record<string, string> = {};

  // Recursive tree walker to apply unsaved changes and flatten files
  function walk(folder: TemplateFolder, currentPath: string = "") {
    for (const item of folder.items) {
      if ("folderName" in item) {
        const nextPath = currentPath
          ? `${currentPath}/${item.folderName}`
          : item.folderName;
        walk(item, nextPath);
      } else {
        const ext = item.fileExtension ? `.${item.fileExtension}` : "";
        const fileNameWithExt = `${item.filename}${ext}`;
        const relativePath = currentPath
          ? `${currentPath}/${fileNameWithExt}`
          : fileNameWithExt;

        // Overlay latest unsaved content from openFiles if available
        if (openFileContentMap.has(relativePath)) {
          const latestContent = openFileContentMap.get(relativePath)!;
          item.content = latestContent;
          flattenedFiles[relativePath] = latestContent;
        } else {
          flattenedFiles[relativePath] = item.content || "";
        }
      }
    }
  }

  walk(clonedTree, "");

  // Guarantee all openFiles are represented in flattenedFiles
  for (const openFile of openFiles) {
    const ext = openFile.fileExtension ? `.${openFile.fileExtension}` : "";
    const defaultName = `${openFile.filename}${ext}`;
    const foundPath = findFilePath(openFile, rootFolder)?.replace(/^\/+/, "");
    const filePath = (foundPath || openFile.id || defaultName).replace(/^\/+/, "");
    if (filePath && !flattenedFiles[filePath]) {
      flattenedFiles[filePath] = openFile.content || "";
    }
  }

  // Extract explicit source files (for C++ and Java)
  const sourceFiles = Object.keys(flattenedFiles).filter((filePath) =>
    /\.(cpp|cc|cxx|c|java|py)$/i.test(filePath)
  );

  return {
    files: flattenedFiles,
    sourceFiles,
    activeFilePath,
    folderTree: clonedTree,
  };
}
