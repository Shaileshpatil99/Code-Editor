import { TemplateFile, TemplateFolder } from "../types";

export function findFilePath(
  file: TemplateFile,
  folder: TemplateFolder,
  pathSoFar: string[] = []
): string | null {
  for (const item of folder.items) {
    if ("folderName" in item) {
      const res = findFilePath(file, item, [...pathSoFar, item.folderName]);
      if (res) return res;
    } else {
      const currentPath = [
        ...pathSoFar,
        item.filename + (item.fileExtension ? "." + item.fileExtension : ""),
      ].join("/");

      const cleanCurrentPath = currentPath.replace(/^\/+/, "");
      const fileRecord = file as unknown as Record<string, unknown>;

      if ("id" in file && typeof fileRecord.id === "string") {
        const cleanFileId = fileRecord.id.replace(/^\/+/, "");
        if (
          cleanFileId === cleanCurrentPath ||
          cleanFileId.endsWith(`/${cleanCurrentPath}`) ||
          cleanCurrentPath.endsWith(`/${cleanFileId}`)
        ) {
          return currentPath;
        }
      }

      if (
        item === file ||
        (item.filename === file.filename &&
          (item.fileExtension || "") === (file.fileExtension || ""))
      ) {
        return currentPath;
      }
    }
  }
  return null;
}

export const generateFileId = (file: TemplateFile, rootFolder: TemplateFolder): string => {
  // Find the file's path in the folder structure
  const path = findFilePath(file, rootFolder)?.replace(/^\/+/, '') || '';
  
  if (path) return path;

  // Handle empty/undefined file extension
  const extension = file.fileExtension?.trim();
  const extensionSuffix = extension ? `.${extension}` : '';

  // Fallback if path not found
  return `${file.filename}${extensionSuffix}`;
}