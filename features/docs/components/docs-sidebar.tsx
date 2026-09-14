"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, BookOpen, Code2, Terminal, Activity } from "lucide-react";
import { DOC_CATEGORIES } from "../data/docs-data";

interface DocsSidebarProps {
  activeDocId: string;
  onSelectDoc?: (id: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "getting-started": BookOpen,
  runtimes: Code2,
  features: Terminal,
  diagnostics: Activity,
};

export const DocsSidebar: React.FC<DocsSidebarProps> = ({ activeDocId, onSelectDoc }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = DOC_CATEGORIES.map((cat) => {
    const matchingItems = cat.items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.badge && item.badge.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return { ...cat, items: matchingItems };
  }).filter((cat) => cat.items.length > 0);

  return (
    <div className="w-full md:w-64 lg:w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/50 min-h-[calc(100vh-4rem)] p-4 flex flex-col gap-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search docs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all"
        />
      </div>

      {/* Categories Tree */}
      <div className="flex flex-col gap-6 overflow-y-auto pr-1">
        {filteredCategories.map((category) => {
          const CategoryIcon = CATEGORY_ICONS[category.id] || BookOpen;

          return (
            <div key={category.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <CategoryIcon className="size-3.5 text-rose-500" />
                <span>{category.name}</span>
              </div>

              <div className="flex flex-col gap-0.5 mt-1">
                {category.items.map((item) => {
                  const isActive = activeDocId === item.id;

                  return (
                    <Link
                      key={item.id}
                      href={`/docs?topic=${item.id}`}
                      onClick={() => onSelectDoc?.(item.id)}
                      className={`group flex items-center justify-between px-3 py-2 text-xs rounded-md transition-all ${
                        isActive
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium border-l-2 border-rose-500"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      <span className="truncate">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="p-4 text-center text-xs text-zinc-400">
            No documentation matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
};
