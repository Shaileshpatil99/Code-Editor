import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { TemplateFolder } from "../lib/path-to-json";
import { getPlaygroundForUser } from "@/features/dashboard/actions";
import { getPlaygroundById, SaveUpdatedCode } from "../actions";

import { Templates } from "@/lib/generated/prisma";

export interface PlaygroundData {
  id: string;
  title?: string;
  description?: string | null;
  template?: Templates;
  userId?: string;
  [key: string]: unknown;
}

interface usePlaygroundReturn {
  playgroundData: PlaygroundData | null;
  templateData: TemplateFolder | null;
  isLoading: boolean;
  error: string | null;
  loadPlayground: () => Promise<void>;
  saveTemplateData: (data: TemplateFolder) => Promise<void>;
}

export const usePlayground = (id: string): usePlaygroundReturn => {
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(null);
  const [templateData, setTemplateData] = useState<TemplateFolder | null>(null);
  const [isLoading, setIsloading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlayground = useCallback(async () => {
    if (!id) return;

    try {
      setIsloading(true);
      setError(null);

      const data = await getPlaygroundById(id);

      //  @ts-expect-error - Prisma return type mismatch with PlaygroundData
      setPlaygroundData(data);
      const rawContent = data?.templateFiles?.[0]?.content;

      if (typeof rawContent === "string") {
        const parsedContent = JSON.parse(rawContent);
        setTemplateData(parsedContent);
        toast.success("Playground loaded Successfully");
        return;
      }

      const res = await fetch(`/api/template/${id}`);
      if (!res.ok) throw new Error(`Failed to load template: ${res.status}`);

      const templateRes = await res.json();
      if (templateRes.templateJson && Array.isArray(templateRes.templateJson)) {
        setTemplateData({
          folderName: "Root",
          items: templateRes.templateJson,
        });
      } else {
        setTemplateData(
          templateRes.templateJson || {
            folderName: "Root",
            items: [],
          },
        );
      }

      toast.success("Template loaded successfully");
    } catch (error) {
      console.error("Error loading playground:", error);
      setError("Failed to load playground data");
      toast.error("Failed to load playground data");
    } finally {
      setIsloading(false);
    }
  }, [id]);

   const saveTemplateData = useCallback(async (data: TemplateFolder) => {
    try {
      const result = await SaveUpdatedCode(id, data);
      if (result?.success) {
        setTemplateData(data);
        toast.success("Changes saved successfully");
      } else {
        toast.error(result?.error || "Failed to save changes");
      }
    } catch (err) {
      console.error("Error saving playground:", err);
      toast.error("Failed to save changes");
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => { loadPlayground(); });
  }, [loadPlayground]);

   return {
    playgroundData,
    templateData,
    isLoading,
    error,
    loadPlayground,
    saveTemplateData,
  };
};
