"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Square,
  Loader2,
  ChevronDown,
  Code2,
  Coffee,
  Terminal,
  Check,
  Globe,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useExecutionStore } from "../hooks/useExecutionStore";
import { Templates } from "@/lib/generated/prisma";

interface ExecutionActionBarProps {
  template?: Templates;
  projectTemplate?: Templates;
  onRun: () => void;
  onStop: () => void;
  onSelectTemplate?: (template: Templates) => void;
}

const ALL_TEMPLATES_CONFIG: Record<
  Templates,
  { label: string; sublabel: string; icon: React.ComponentType<{ className?: string }> }
> = {
  REACT: { id: "REACT", label: "React", sublabel: "(Vite)", icon: Globe },
  NEXTJS: { id: "NEXTJS", label: "Next.js", sublabel: "(Node)", icon: Globe },
  EXPRESS: { id: "EXPRESS", label: "Express", sublabel: "(Node)", icon: Globe },
  VUE: { id: "VUE", label: "Vue", sublabel: "(Vite)", icon: Globe },
  HONO: { id: "HONO", label: "Hono", sublabel: "(Node)", icon: Globe },
  ANGULAR: { id: "ANGULAR", label: "Angular", sublabel: "(Node)", icon: Globe },
  CPP: { id: "CPP", label: "C++", sublabel: "(g++)", icon: Code2 },
  C: { id: "C", label: "C", sublabel: "(gcc)", icon: Code2 },
  JAVA: { id: "JAVA", label: "Java", sublabel: "(OpenJDK)", icon: Coffee },
  PYTHON: { id: "PYTHON", label: "Python", sublabel: "(Python 3)", icon: Terminal },
} as Record<string, { id: string; label: string; sublabel: string; icon: React.ComponentType<{ className?: string }> }>;

export const ExecutionActionBar: React.FC<ExecutionActionBarProps> = ({
  template,
  projectTemplate,
  onRun,
  onStop,
  onSelectTemplate,
}) => {
  const { isRunning, status } = useExecutionStore();

  const isPreparing = status === "PREPARING" || status === "COMPILING";

  const currentOption = template ? ALL_TEMPLATES_CONFIG[template] : null;
  const displayLabel = currentOption
    ? `${currentOption.label} ${currentOption.sublabel}`
    : template || "Select";

  // Build the available options list:
  // 1. Primary web template for this project (default REACT)
  const baseWeb: Templates =
    projectTemplate && ["REACT", "NEXTJS", "EXPRESS", "VUE", "HONO", "ANGULAR"].includes(projectTemplate)
      ? projectTemplate
      : template && ["REACT", "NEXTJS", "EXPRESS", "VUE", "HONO", "ANGULAR"].includes(template)
      ? template
      : "REACT";

  // 2. Curated options: Base web template + Native compilers
  const optionsList: Templates[] = [
    baseWeb,
    "CPP",
    "C",
    "JAVA",
    "PYTHON",
  ];

  // If current template is another web template (e.g. NEXTJS when project is REACT), ensure it's in list
  if (template && !optionsList.includes(template)) {
    optionsList.unshift(template);
  }

  return (
    <div className="flex items-center gap-2">
      {/* Language Switcher Dropdown */}
      {onSelectTemplate ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-mono bg-zinc-900 border-zinc-700/70 hover:bg-zinc-800 text-zinc-200 gap-1.5 transition-colors"
                disabled={isRunning}
              >
                {currentOption ? (
                  <currentOption.icon className="size-3.5 text-zinc-400" />
                ) : (
                  <Code2 className="size-3.5 text-zinc-400" />
                )}
                <span>{displayLabel}</span>
                <ChevronDown className="size-3 text-zinc-500 ml-0.5 opacity-70" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52 bg-zinc-900 border-zinc-800 text-zinc-200">
            <div className="px-2 py-1.5 text-[11px] font-semibold text-zinc-400">
              Select Language
            </div>
            {optionsList.map((optId, idx) => {
              const opt = ALL_TEMPLATES_CONFIG[optId];
              if (!opt) return null;
              const Icon = opt.icon;
              const isSelected = template === optId;
              const isFirstNative = optId === "CPP" && idx > 0;

              return (
                <React.Fragment key={optId}>
                  {isFirstNative && <DropdownMenuSeparator className="bg-zinc-800 my-1" />}
                  <DropdownMenuItem
                    onClick={() => onSelectTemplate(optId)}
                    className={`flex items-center justify-between text-xs px-2.5 py-1.5 cursor-pointer rounded hover:bg-zinc-800 hover:text-white ${
                      isSelected ? "bg-zinc-800 text-white font-medium" : "text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="size-3.5 text-zinc-400" />
                      <span>{opt.label}</span>
                      <span className="text-[11px] text-zinc-500">{opt.sublabel}</span>
                    </div>
                    {isSelected && <Check className="size-3.5 text-emerald-400" />}
                  </DropdownMenuItem>
                </React.Fragment>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        template && (
          <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
            {displayLabel}
          </span>
        )
      )}

      {/* Run Button */}
      <Button
        size="sm"
        variant="default"
        onClick={onRun}
        disabled={isRunning}
        className="h-8 px-3 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50"
      >
        {isPreparing ? (
          <>
            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            <span>{status === "COMPILING" ? "Compiling..." : "Preparing..."}</span>
          </>
        ) : isRunning ? (
          <>
            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            <span>Running...</span>
          </>
        ) : (
          <>
            <Play className="size-3.5 mr-1.5 fill-current" />
            <span>Run</span>
          </>
        )}
      </Button>

      {/* Stop Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={onStop}
        disabled={!isRunning}
        className="h-8 px-3 text-xs font-medium text-red-400 border-red-900/50 hover:bg-red-950/40 hover:text-red-300 disabled:opacity-30 transition-all"
      >
        <Square className="size-3 mr-1.5 fill-current" />
        <span>Stop</span>
      </Button>
    </div>
  );
};
