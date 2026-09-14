import { useState, useEffect, useCallback } from "react";
import { WebContainer } from "@webcontainer/api";
import { getWebContainer } from "@/features/execution/services/providers/webcontainer-provider";

interface UseWebContainerReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destroy: () => void;
}

export const useWebContainer = (): UseWebContainerReturn => {
  const [instance, setInstance] = useState<WebContainer | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setIsLoading(true);
        const webcontainer = await getWebContainer();
        if (mounted) {
          setInstance(webcontainer);

          webcontainer.on("server-ready", (port, url) => {
            if (mounted) {
              setServerUrl(url);
            }
          });
        }
      } catch (err: unknown) {
        if (mounted) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to boot WebContainer";
          setError(message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const writeFileSync = useCallback(
    async (filePath: string, content: string) => {
      if (!instance) return;
      await instance.fs.writeFile(filePath, content);
    },
    [instance]
  );

  const destroy = useCallback(() => {
    // WebContainer instances are long-lived singletons
  }, []);

  return {
    serverUrl,
    isLoading,
    error,
    instance,
    writeFileSync,
    destroy,
  };
};
