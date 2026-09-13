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
    const filePath = findFilePath(openFile, rootFolder)?.replace(/^\/+/, "");
    if (filePath) {
      openFileContentMap.set(filePath, openFile.content);
      if (openFile.id === activeFileId) {
        activeFilePath = filePath;
      }
    }
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

  // Extract explicit source files (for C++ and Java)
  const sourceFiles = Object.keys(flattenedFiles).filter((filePath) =>
    /\.(cpp|cc|cxx|c|java)$/i.test(filePath)
  );

  return {
    files: flattenedFiles,
    sourceFiles,
    activeFilePath,
    folderTree: clonedTree,
  };
}
