"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DocsSidebar } from "@/features/docs/components/docs-sidebar";
import { DocsContentView } from "@/features/docs/components/docs-content-view";
import { DOCS_CONTENT, DocSection } from "@/features/docs/data/docs-data";
import { Loader2 } from "lucide-react";

function DocsContentContainer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topicParam = searchParams.get("topic");

  const activeTopic = (topicParam && DOCS_CONTENT[topicParam]) ? topicParam : "overview";

  const handleSelectDoc = (id: string) => {
    router.push(`/docs?topic=${id}`, { scroll: true });
  };

  const currentDoc: DocSection = DOCS_CONTENT[activeTopic] || DOCS_CONTENT["overview"];

  return (
    <div className="flex-1 flex flex-col md:flex-row w-full">
      <DocsSidebar activeDocId={activeTopic} onSelectDoc={handleSelectDoc} />
      <main className="flex-1 min-w-0 bg-white dark:bg-zinc-950">
        <DocsContentView doc={currentDoc} onNavigateDoc={handleSelectDoc} />
      </main>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-zinc-400">
          <Loader2 className="size-6 animate-spin mr-2" />
          <span>Loading documentation...</span>
        </div>
      }
    >
      <DocsContentContainer />
    </Suspense>
  );
}
