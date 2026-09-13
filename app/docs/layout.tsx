import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import UserButton from "@/features/auth/components/user-button";
import { ArrowLeft, BookOpen, LayoutDashboard } from "lucide-react";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Docs Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Logo" width={32} height={32} />
            <span className="font-extrabold text-lg tracking-tight hidden sm:inline">
              Code Editor
            </span>
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            <BookOpen className="size-3.5" />
            <span>Documentation</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium border-zinc-200 dark:border-zinc-800">
              <LayoutDashboard className="size-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>
          <ThemeToggle />
          <UserButton />
        </div>
      </header>

      {/* Main Docs Body */}
      <div className="flex-1 flex flex-col md:flex-row">{children}</div>
    </div>
  );
}
