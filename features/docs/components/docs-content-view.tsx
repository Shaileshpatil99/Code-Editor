"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Info,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { DocSection, DOC_CATEGORIES } from "../data/docs-data";

interface DocsContentViewProps {
  doc: DocSection;
  onNavigateDoc?: (id: string) => void;
}

export const DocsContentView: React.FC<DocsContentViewProps> = ({
  doc,
  onNavigateDoc,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const allItems = DOC_CATEGORIES.flatMap((cat) => cat.items);
  const currentIndex = allItems.findIndex((item) => item.id === doc.id);
  const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextItem =
    currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

  return (
    <div className="flex-1 max-w-4xl px-4 py-8 md:px-8 lg:px-12 mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6 font-mono">
        <Link href="/docs" className="hover:text-rose-500 transition-colors">
          Docs
        </Link>
        <span>/</span>
        <span className="capitalize">{doc.category.replace("-", " ")}</span>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-200 font-medium">
          {doc.title}
        </span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col gap-3 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {doc.title}
          </h1>
        </div>

        <p className="text-base text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
          {doc.summary}
        </p>
      </div>

      {/* Main Subsections */}
      <div className="mt-8 space-y-10">
        {doc.subsections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-4">
            {section.heading && (
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 pb-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                {section.heading}
              </h2>
            )}

            {/* Paragraphs */}
            {section.paragraphs &&
              section.paragraphs.map((para, pIdx) => (
                <p
                  key={pIdx}
                  className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed"
                >
                  {para}
                </p>
              ))}

            {/* Step Timeline Cards */}
            {section.steps && (
              <div className="space-y-3.5 my-4">
                {section.steps.map((step, stepIdx) => (
                  <div
                    key={stepIdx}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 flex flex-col gap-2.5 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-6 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center border border-rose-500/20 shrink-0">
                        {stepIdx + 1}
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {step.title}
                      </h3>
                    </div>

                    {step.desc && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-9 leading-relaxed">
                        {step.desc}
                      </p>
                    )}

                    {step.items && step.items.length > 0 && (
                      <ul className="pl-9 space-y-1.5 mt-1">
                        {step.items.map((it, itIdx) => (
                          <li
                            key={itIdx}
                            className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300"
                          >
                            <span className="size-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                            <span className="leading-relaxed">{it}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bullets List */}
            {section.bullets && (
              <ul className="space-y-2.5 my-3">
                {section.bullets.map((bullet, bIdx) => (
                  <li
                    key={bIdx}
                    className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300"
                  >
                    <span className="size-1.5 rounded-full bg-rose-500 shrink-0 mt-2" />
                    <span className="leading-relaxed">
                      {bullet.label && (
                        <strong className="font-semibold text-zinc-900 dark:text-zinc-100 mr-1.5">
                          {bullet.label}:
                        </strong>
                      )}
                      <span>{bullet.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Callout Card */}
            {section.callout && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 my-4 ${
                  section.callout.type === "tip"
                    ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200"
                    : section.callout.type === "warning"
                    ? "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-200"
                    : "bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200"
                }`}
              >
                {section.callout.type === "tip" ? (
                  <Lightbulb className="size-5 text-amber-500 shrink-0 mt-0.5" />
                ) : section.callout.type === "warning" ? (
                  <AlertTriangle className="size-5 text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <Info className="size-5 text-blue-500 shrink-0 mt-0.5" />
                )}
                <div className="flex flex-col gap-1">
                  {section.callout.title && (
                    <div className="text-xs font-semibold uppercase tracking-wider">
                      {section.callout.title}
                    </div>
                  )}
                  <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {section.callout.text}
                  </div>
                </div>
              </div>
            )}

            {/* Code Block */}
            {section.codeBlock && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 overflow-hidden shadow-md my-4">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs font-mono">
                  <div className="flex items-center gap-2 text-zinc-300 font-medium">
                    <Terminal className="size-3.5 text-rose-500" />
                    <span>{section.codeBlock.filename}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(section.codeBlock!.code)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-xs font-mono text-zinc-200 leading-relaxed bg-zinc-950">
                  <code>{section.codeBlock.code}</code>
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>



      {/* Bottom Next/Prev Pagination */}
      <div className="mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
        {prevItem ? (
          <Link
            href={`/docs?topic=${prevItem.id}`}
            onClick={() => onNavigateDoc?.(prevItem.id)}
            className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-rose-500/50 hover:bg-rose-500/5 transition-all text-xs font-medium text-zinc-600 dark:text-zinc-300"
          >
            <ChevronLeft className="size-4" />
            <div className="text-left">
              <div className="text-[10px] text-zinc-400 uppercase font-mono">
                Previous
              </div>
              <div className="font-semibold text-zinc-900 dark:text-white">
                {prevItem.title}
              </div>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {nextItem ? (
          <Link
            href={`/docs?topic=${nextItem.id}`}
            onClick={() => onNavigateDoc?.(nextItem.id)}
            className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-rose-500/50 hover:bg-rose-500/5 transition-all text-xs font-medium text-zinc-600 dark:text-zinc-300 ml-auto"
          >
            <div className="text-right">
              <div className="text-[10px] text-zinc-400 uppercase font-mono">
                Next
              </div>
              <div className="font-semibold text-zinc-900 dark:text-white">
                {nextItem.title}
              </div>
            </div>
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};
