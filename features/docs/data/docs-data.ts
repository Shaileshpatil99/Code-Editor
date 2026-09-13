export interface DocBullet {
  label?: string;
  text: string;
}

export interface DocStep {
  title: string;
  desc?: string;
  items?: string[];
}

export interface DocCallout {
  type: "info" | "warning" | "tip";
  title?: string;
  text: string;
}

export interface DocTable {
  headers: string[];
  rows: string[][];
}

export interface DocSubSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: DocBullet[];
  steps?: DocStep[];
  callout?: DocCallout;
  table?: DocTable;
  codeBlock?: {
    language: string;
    filename: string;
    code: string;
  };
}

export interface DocSection {
  id: string;
  title: string;
  category: "getting-started" | "runtimes" | "features" | "diagnostics";
  summary: string;
  badge?: string;
  badgeVariant?: "emerald" | "amber" | "blue" | "default";
  subsections: DocSubSection[];
  featuresList?: string[];
}

export interface DocCategory {
  id: string;
  name: string;
  items: { id: string; title: string; badge?: string }[];
}

export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: "getting-started",
    name: "Getting Started",
    items: [
      { id: "overview", title: "Overview & Architecture" },
      { id: "quickstart", title: "Quick Start Guide" },
    ],
  },
  {
    id: "runtimes",
    name: "Supported Languages & Runtimes",
    items: [
      { id: "react", title: "React (Vite)", badge: "WebContainer" },
      { id: "nextjs", title: "Next.js (Node)", badge: "WebContainer" },
      { id: "express", title: "Express (Node)", badge: "WebContainer" },
      { id: "vue", title: "Vue (Vite)", badge: "WebContainer" },
      { id: "hono", title: "Hono (Node)", badge: "WebContainer" },
      { id: "angular", title: "Angular (Node)", badge: "WebContainer" },
      { id: "cpp", title: "C++ (g++)", badge: "Native MinGW" },
      { id: "c", title: "C (gcc)", badge: "Native MinGW" },
      { id: "java", title: "Java (OpenJDK)", badge: "Native Java" },
      { id: "python", title: "Python (Python 3)", badge: "Native Python" },
    ],
  },
  {
    id: "features",
    name: "IDE & Terminal Features",
    items: [
      { id: "monaco-editor", title: "Monaco Editor & Settings" },
      { id: "interactive-terminal", title: "Real Interactive Terminal" },
      { id: "auto-language-sync", title: "Auto Language Detection" },
      { id: "snapshot-execution", title: "Unsaved Snapshot Execution" },
    ],
  },
  {
    id: "diagnostics",
    name: "Diagnostics & System Health",
    items: [
      { id: "toolchain-diagnostics", title: "Local Toolchain Status" },
      { id: "troubleshooting", title: "Troubleshooting & Cross-Origin" },
    ],
  },
];

export const DOCS_CONTENT: Record<string, DocSection> = {
  overview: {
    id: "overview",
    title: "Overview & Architecture",
    category: "getting-started",
    summary:
      "Code Editor is an enterprise-grade cloud and native execution IDE. It combines in-browser WebContainer Node runtimes with native local compilers for ultra low-latency code execution.",
    subsections: [
      {
        heading: "Dual-Engine Execution Architecture",
        paragraphs: [
          "Code Editor operates a high-performance dual-engine runtime architecture designed to execute both modern fullstack web frameworks and native compiled languages with maximum efficiency.",
        ],
        steps: [
          {
            title: "Web & Node Runtimes (WebContainers)",
            desc: "Runs directly in your browser using WebAssembly sandboxing.",
            items: [
              "Node.js, Vite, Next.js, Express, Vue, Hono, and Angular execute locally in-browser.",
              "Zero network overhead with instant Hot Module Replacement (HMR).",
              "Real-time port detection and automatic inline browser preview rendering.",
            ],
          },
          {
            title: "Native Host Execution Engine (MinGW / OpenJDK / Python)",
            desc: "Executes directly against your system toolchains with sub-millisecond process startup.",
            items: [
              "C and C++ compiled with MinGW GCC/G++ with -O2 optimization.",
              "Java compiled via OpenJDK javac and executed in standard JVM.",
              "Python 3 executed in unbuffered mode (python -u) for instant output streaming.",
              "Bidirectional Server-Sent Events (SSE) streaming with active process watchdog timers.",
            ],
          },
        ],
      },
      {
        heading: "Key Architecture Benefits",
        bullets: [
          {
            label: "Zero Latency Web Previews",
            text: "Instant feedback loop for Vite and React projects without server roundtrips.",
          },
          {
            label: "Real Interactive Stdin",
            text: "Full terminal support for interactive programs expecting user keyboard inputs (cin, scanf, System.in, input).",
          },
          {
            label: "Unsaved Snapshot Execution",
            text: "Execute modified Monaco editor tabs instantly in memory without force-saving incomplete work.",
          },
          {
            label: "Dynamic Auto-Language Sync",
            text: "The header action dropdown automatically adapts to your active file type (e.g. .tsx, .cpp, .java, .py).",
          },
        ],
      },
    ],
    featuresList: [
      "In-Browser Node.js WebContainer Sandbox",
      "Native MinGW GCC & G++ Compilation",
      "Native OpenJDK Java Execution Engine",
      "Native Unbuffered Python 3 Interpreter",
      "Interactive xterm.js Terminal with Stdin",
      "Dynamic Monaco Editor Settings Synchronization",
    ],
  },

  quickstart: {
    id: "quickstart",
    title: "Quick Start Guide",
    category: "getting-started",
    summary:
      "Get up and running with Code Editor in under two minutes. Learn how to launch a playground, execute code, and supply interactive terminal inputs.",
    subsections: [
      {
        heading: "1. Launching a Playground",
        paragraphs: [
          "Create a fresh workspace tailored to your preferred language or framework in a single click.",
        ],
        bullets: [
          {
            label: "Navigate to Dashboard",
            text: "Click Dashboard in the top navigation bar or the Get Started button on the home page.",
          },
          {
            label: "Select a Template",
            text: "Choose from 10 supported environments including React, Next.js, Express, C++, C, Java, and Python.",
          },
          {
            label: "Enter Project Name",
            text: "Give your playground a title and click Create Playground to open the IDE workspace.",
          },
        ],
      },
      {
        heading: "2. Writing and Executing Code",
        paragraphs: [
          "The top action bar allows you to run and stop your application at any time.",
        ],
        steps: [
          {
            title: "Web & Node Projects",
            desc: "Click the Run button to start the Vite or Node development server. The interactive Preview tab opens automatically upon server readiness.",
          },
          {
            title: "Native Projects (C++, C, Java, Python)",
            desc: "Click Run to trigger native compilation and execution. Output streams into the integrated terminal in real-time.",
          },
        ],
      },
      {
        heading: "3. Interactive Keyboard Input (Stdin)",
        callout: {
          type: "tip",
          title: "Real Terminal Typing",
          text: "When your code calls cin, scanf, Scanner, or input(), click directly inside the terminal window, type your text, and press Enter.",
        },
        codeBlock: {
          language: "cpp",
          filename: "main.cpp",
          code: `#include <iostream>
#include <string>

int main() {
    std::string name;
    std::cout << "Enter your name: ";
    std::cin >> name;
    std::cout << "Hello, " << name << "! Welcome to Code Editor." << std::endl;
    return 0;
}`,
        },
      },
    ],
  },

  react: {
    id: "react",
    title: "React (Vite)",
    category: "runtimes",
    summary:
      "Modern React 18 Single Page Application runtime powered by Vite and WebContainers with sub-millisecond Hot Module Replacement.",
    badge: "WebContainer",
    badgeVariant: "emerald",
    subsections: [
      {
        heading: "Environment Highlights",
        bullets: [
          {
            label: "React 18 & TypeScript",
            text: "Full TSX/JSX syntax highlighting, type definitions, and autocompletion powered by Monaco Editor.",
          },
          {
            label: "Vite HMR Engine",
            text: "Modifications made to App.tsx or stylesheets update the live preview instantaneously without resetting application state.",
          },
          {
            label: "Package Installation",
            text: "Install additional npm packages on demand using the integrated terminal.",
          },
        ],
      },
      {
        heading: "Starter Code Example",
        codeBlock: {
          language: "typescript",
          filename: "src/App.tsx",
          code: `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-zinc-950 text-white">
      <h1 className="text-3xl font-bold text-rose-500">React + Vite Playground</h1>
      <p className="mt-2 text-zinc-400">Edit src/App.tsx to test live HMR updates.</p>
      
      <button
        onClick={() => setCount((c) => c + 1)}
        className="mt-6 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 font-semibold rounded-lg transition-colors"
      >
        Clicked {count} times
      </button>
    </div>
  );
}`,
        },
      },
    ],
  },

  nextjs: {
    id: "nextjs",
    title: "Next.js (Node)",
    category: "runtimes",
    summary:
      "Fullstack Next.js App Router environment running on in-browser Node WebContainers with React Server Components.",
    badge: "WebContainer",
    badgeVariant: "emerald",
    subsections: [
      {
        heading: "Framework Capabilities",
        bullets: [
          {
            label: "App Router Support",
            text: "Full support for app/ directory layout, server components, and client components.",
          },
          {
            label: "API Route Handlers",
            text: "Build backend REST endpoints under app/api/ with native JSON parsing.",
          },
          {
            label: "Inline Browser Preview",
            text: "Next.js dev server output automatically proxies to the live preview panel.",
          },
        ],
      },
      {
        heading: "Starter Code Example",
        codeBlock: {
          language: "typescript",
          filename: "app/page.tsx",
          code: `export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white">
      <h1 className="text-4xl font-extrabold tracking-tight">Next.js App Router</h1>
      <p className="mt-4 text-zinc-400">Running fullstack React Server Components in WebContainers.</p>
    </main>
  );
}`,
        },
      },
    ],
  },

  express: {
    id: "express",
    title: "Express (Node)",
    category: "runtimes",
    summary:
      "Backend Node.js server with Express routes, JSON middleware, and live port forwarding.",
    badge: "WebContainer",
    badgeVariant: "emerald",
    subsections: [
      {
        heading: "Server Highlights",
        bullets: [
          {
            label: "REST API Development",
            text: "Configure GET, POST, PUT, and DELETE endpoints with standard Express middleware.",
          },
          {
            label: "Port Forwarding",
            text: "Automatic port detection forwards server listener to the preview address toolbar.",
          },
        ],
      },
      {
        heading: "Starter Code Example",
        codeBlock: {
          language: "javascript",
          filename: "index.js",
          code: `const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Express API', status: 'healthy', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(\`Server listening on http://localhost:\${PORT}\`);
});`,
        },
      },
    ],
  },

  vue: {
    id: "vue",
    title: "Vue (Vite)",
    category: "runtimes",
    summary:
      "Vue 3 Single File Components (SFC) powered by Vite and WebContainers with Composition API.",
    badge: "WebContainer",
    badgeVariant: "emerald",
    subsections: [
      {
        heading: "Features",
        bullets: [
          {
            label: "Composition API",
            text: "Full support for script setup syntax and reactive state primitives (ref, reactive, computed).",
          },
          {
            label: "Scoped CSS",
            text: "Component style encapsulation with hot stylesheet reloading.",
          },
        ],
      },
      {
        heading: "Starter Code Example",
        codeBlock: {
          language: "html",
          filename: "src/App.vue",
          code: `<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="container">
    <h1>Vue 3 + Vite</h1>
    <button @click="count++">Count: {{ count }}</button>
  </div>
</template>`,
        },
      },
    ],
  },

  hono: {
    id: "hono",
    title: "Hono (Node)",
    category: "runtimes",
    summary:
      "Lightweight, ultra-fast web framework optimized for modern TypeScript backends.",
    badge: "WebContainer",
    badgeVariant: "emerald",
    subsections: [
      {
        heading: "Framework Features",
        bullets: [
          {
            label: "Zero Dependencies",
            text: "Minimalist footprint with instant startup performance.",
          },
          {
            label: "Type Safety",
            text: "End-to-end typed routes and RPC client integration.",
          },
        ],
      },
      {
        heading: "Starter Code Example",
        codeBlock: {
          language: "typescript",
          filename: "src/index.ts",
          code: `import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ service: 'Hono API', version: '1.0' }))

export default app`,
        },
      },
    ],
  },

  angular: {
    id: "angular",
    title: "Angular (Node)",
    category: "runtimes",
    summary:
      "Enterprise Single Page Application development using Angular CLI in WebContainers.",
    badge: "WebContainer",
    badgeVariant: "emerald",
    subsections: [
      {
        heading: "Enterprise SPA Features",
        bullets: [
          {
            label: "Component Architecture",
            text: "TypeScript decorators, dependency injection, and reactive observables.",
          },
          {
            label: "Angular CLI Tools",
            text: "Preconfigured build pipelines with live compiler diagnostics.",
          },
        ],
      },
      {
        heading: "Starter Code Example",
        codeBlock: {
          language: "typescript",
          filename: "src/app/app.component.ts",
          code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<div class="app"><h1>Angular Playground</h1></div>',
})
export class AppComponent {}`,
        },
      },
    ],
  },

  cpp: {
    id: "cpp",
    title: "C++ (g++)",
    category: "runtimes",
    summary:
      "High-performance native C++ compiler backed by local MinGW g++ with interactive stdin streaming and C++17 STL support.",
    badge: "Native MinGW",
    badgeVariant: "amber",
    subsections: [
      {
        heading: "Compiler Configuration",
        bullets: [
          {
            label: "Compiler Command",
            text: "g++ -std=c++17 -O2 -Wall main.cpp -o main.exe",
          },
          {
            label: "Execution Watchdog",
            text: "15-second automatic process timeout guard prevents hung loops.",
          },
          {
            label: "Interactive Stdin",
            text: "Real-time character and line streaming for std::cin and getline().",
          },
        ],
      },
      {
        heading: "Starter Code Example",
        codeBlock: {
          language: "cpp",
          filename: "main.cpp",
          code: `#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> numbers = {10, 25, 30, 45, 50};
    int total = std::accumulate(numbers.begin(), numbers.end(), 0);
    
    std::cout << "Sum of numbers: " << total << std::endl;
    std::cout << "Average: " << (double)total / numbers.size() << std::endl;
    return 0;
}`,
        },
      },
    ],
  },

  c: {
    id: "c",
    title: "C (gcc)",
    category: "runtimes",
    summary:
      "Native C language compilation using MinGW GCC with C11 standard support, memory allocation, and real-time console I/O.",
    badge: "Native MinGW",
    badgeVariant: "amber",
    subsections: [
      {
        heading: "Toolchain Details",
        bullets: [
          {
            label: "Compiler Command",
            text: "gcc -std=c11 -O2 -Wall main.c -o main.exe",
          },
          {
            label: "Memory & Pointers",
            text: "Full support for malloc, free, struct definitions, and pointer arithmetic.",
          },
        ],
      },
      {
        heading: "Starter Code Example",
        codeBlock: {
          language: "c",
          filename: "main.c",
          code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int count = 5;
    int *array = (int*) malloc(count * sizeof(int));
    
    for (int i = 0; i < count; i++) {
        array[i] = (i + 1) * 100;
        printf("Element [%d] = %d\\n", i, array[i]);
    }
    
    free(array);
    return 0;
}`,
        },
      },
    ],
  },

  java: {
    id: "java",
    title: "Java (OpenJDK)",
    category: "runtimes",
    summary:
      "Native OpenJDK javac compilation and JVM execution with interactive java.util.Scanner stdin support.",
    badge: "Native Java",
    badgeVariant: "blue",
    subsections: [
      {
        heading: "Java Runtime Configuration",
        bullets: [
          {
            label: "Compilation Step",
            text: "javac Main.java to generate bytecode classes.",
          },
          {
            label: "Execution Step",
            text: "java Main to launch the JVM process with connected stdin/stdout pipes.",
          },
        ],
      },
      {
        heading: "Starter Code Example",
        codeBlock: {
          language: "java",
          filename: "Main.java",
          code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("Java OpenJDK 24 Runtime Active");
        System.out.print("Enter a number to square: ");
        
        if (scanner.hasNextInt()) {
            int num = scanner.nextInt();
            System.out.println("Result: " + (num * num));
        }
        scanner.close();
    }
}`,
        },
      },
    ],
  },

  python: {
    id: "python",
    title: "Python (Python 3)",
    category: "runtimes",
    summary:
      "Native Python 3 interpreter running in unbuffered mode for instantaneous standard output streaming.",
    badge: "Native Python",
    badgeVariant: "blue",
    subsections: [
      {
        heading: "Interpreter Settings",
        bullets: [
          {
            label: "Execution Command",
            text: "python -u main.py (Unbuffered mode for real-time output delivery).",
          },
          {
            label: "Standard Library",
            text: "Access to math, json, sys, os, collections, and standard algorithms.",
          },
        ],
      },
      {
        heading: "Starter Code Example",
        codeBlock: {
          language: "python",
          filename: "main.py",
          code: `import math

def generate_primes(limit):
    primes = []
    for num in range(2, limit + 1):
        if all(num % i != 0 for i in range(2, int(math.isqrt(num)) + 1)):
            primes.append(num)
    return primes

print("Prime numbers up to 50:")
print(generate_primes(50))`,
        },
      },
    ],
  },

  "monaco-editor": {
    id: "monaco-editor",
    title: "Monaco Editor & Settings",
    category: "features",
    summary:
      "Enterprise editor features with persistent preferences, live theme switching, and custom typography.",
    subsections: [
      {
        heading: "Customizable Editor Preferences",
        bullets: [
          {
            label: "Themes",
            text: "Switch between Dark (vs-dark), Light (vs), and High Contrast (hc-black).",
          },
          {
            label: "Font Size & Layout",
            text: "Adjust font size (10px to 24px), line height, and font family on the fly.",
          },
          {
            label: "Editor Behaviors",
            text: "Toggle minimap, word wrapping, line numbers, smooth cursor blinking, and auto-closing brackets.",
          },
          {
            label: "Tab Spacing",
            text: "Customize tab indentation size between 2 spaces and 4 spaces.",
          },
        ],
      },
    ],
  },

  "interactive-terminal": {
    id: "interactive-terminal",
    title: "Real Interactive Terminal",
    category: "features",
    summary:
      "Full-featured xterm.js terminal with direct typing, ANSI color rendering, and real-time stdin piping.",
    subsections: [
      {
        heading: "Terminal Features",
        bullets: [
          {
            label: "Direct Interactive Stdin",
            text: "Click into the terminal cursor and type inputs to live running programs seamlessly.",
          },
          {
            label: "Process Watchdog Guard",
            text: "Automatically terminates runaway infinite loops after 15 seconds to keep your browser responsive.",
          },
          {
            label: "ANSI Colors & Formatting",
            text: "Full 256-color output for compiler warnings, test runners, and diagnostic logs.",
          },
        ],
      },
    ],
  },

  "auto-language-sync": {
    id: "auto-language-sync",
    title: "Auto Language Detection",
    category: "features",
    summary:
      "Automatic dropdown synchronization based on active file extensions.",
    subsections: [
      {
        heading: "Language Mapping Rules",
        bullets: [
          {
            label: "Web & UI Files (.tsx, .jsx, .css, .html, .vue)",
            text: "Automatically sets the execution context to your project's primary web framework.",
          },
          {
            label: "C++ Files (.cpp, .cc, .hpp)",
            text: "Auto-switches dropdown to C++ (g++).",
          },
          {
            label: "C Files (.c)",
            text: "Auto-switches dropdown to C (gcc).",
          },
          {
            label: "Java Files (.java)",
            text: "Auto-switches dropdown to Java (OpenJDK).",
          },
          {
            label: "Python Files (.py)",
            text: "Auto-switches dropdown to Python (Python 3).",
          },
        ],
      },
    ],
  },

  "snapshot-execution": {
    id: "snapshot-execution",
    title: "Unsaved Snapshot Execution",
    category: "features",
    summary:
      "Execute unsaved Monaco buffer edits instantly without risking uncommitted file overwrites.",
    subsections: [
      {
        heading: "How It Works",
        bullets: [
          {
            label: "In-Memory Snapshotting",
            text: "When you click Run, modified editor tabs are compiled directly from memory.",
          },
          {
            label: "Zero Disk Pollution",
            text: "Experimental edits run immediately without requiring manual save actions or file overwrites.",
          },
        ],
      },
    ],
  },

  "toolchain-diagnostics": {
    id: "toolchain-diagnostics",
    title: "Local Toolchain Status",
    category: "diagnostics",
    summary:
      "Inspect local compiler statuses and environment readiness via Settings Diagnostics.",
    subsections: [
      {
        heading: "Host Diagnostics API",
        paragraphs: [
          "Check the operational status of your local compilers at any time through Settings or via API:",
        ],
        bullets: [
          {
            label: "GCC (C Compiler)",
            text: "Reports installed MinGW GCC version and path availability.",
          },
          {
            label: "G++ (C++ Compiler)",
            text: "Reports installed MinGW G++ version and C++17 support.",
          },
          {
            label: "Python",
            text: "Reports active Python 3 runtime version.",
          },
          {
            label: "Java & Javac",
            text: "Reports OpenJDK compiler and JVM runtime status.",
          },
          {
            label: "WebContainers",
            text: "Reports cross-origin isolation and SharedArrayBuffer browser capability.",
          },
        ],
      },
    ],
  },

  troubleshooting: {
    id: "troubleshooting",
    title: "Troubleshooting & Cross-Origin",
    category: "diagnostics",
    summary:
      "Common troubleshooting steps for WebContainer cross-origin headers and native runtimes.",
    subsections: [
      {
        heading: "WebContainer SharedArrayBuffer Isolation",
        paragraphs: [
          "WebContainers require cross-origin isolation in the browser.",
        ],
        bullets: [
          {
            label: "Header: Cross-Origin-Opener-Policy",
            text: "Must be set to same-origin on the playground route.",
          },
          {
            label: "Header: Cross-Origin-Embedder-Policy",
            text: "Must be set to credentialless for WebContainer worker support.",
          },
          {
            label: "Auto-Verification",
            text: "The IDE automatically verifies window.crossOriginIsolated on page load and performs a one-time sync reload if needed.",
          },
        ],
      },
    ],
  },
};
