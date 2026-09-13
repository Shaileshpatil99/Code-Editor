# Comprehensive Bug & Issue Audit Report: Code-Editor Application

**Generated:** September 14, 2026  
**Audited Repository:** `Code-Editor`  
**Scope:** Full-stack audit covering Architecture, Security, API Routes, Execution Engines (WebContainer & Native Compilers), Authentication, Database Schema, State Management, UI/UX, and Linting/Build pipelines.  
**Report File Location:** `C:\Users\Shailesh\.gemini\antigravity\brain\103269ff-a928-4c0f-a523-4ccbbfb6a6ba\BUGS_AND_ISSUES.md`

---

## Executive Summary

A comprehensive, non-destructive audit of the entire codebase was conducted across all files, routes, hooks, services, and configuration layers. 

The audit identified **38 distinct bugs, vulnerabilities, and code defects** categorized into:
- **Critical & High Security Flaws:** 6 issues (including unauthenticated Remote Code Execution on the host machine and widespread IDOR vulnerabilities).
- **Architecture, Runtime & Cloud Incompatibilities:** 6 issues (Windows OS lock-in, race conditions in template generation, Safari cross-origin isolation failures, serverless state loss).
- **Core Application & Workbench Logic Bugs:** 11 issues (file path corruption, identical filename collisions across folders, Python execution breakage, destructive auto-template flipping).
- **Database & Prisma Schema Deficiencies:** 4 issues (missing timestamp fields, orphaned duplicated projects, unhandled auth crashes).
- **UI/UX Bugs, Stubs & Typographical Defects:** 7 issues (dummy button stubs, missing icons, unauthenticated fallback issues, layout typos).
- **Compilation & ESLint Errors:** 4 major categories encompassing **107 ESLint problems** (65 errors, 42 warnings).

---

## Table of Contents
1. [Security Vulnerabilities (Critical & High)](#1-security-vulnerabilities-critical--high)
2. [Architecture, Runtime & Cloud Incompatibilities](#2-architecture-runtime--cloud-incompatibilities)
3. [Core Application & Workbench Logic Bugs](#3-core-application--workbench-logic-bugs)
4. [Database Schema & Data Integrity Issues](#4-database-schema--data-integrity-issues)
5. [UI / UX Deficiencies, Broken Features & Typos](#5-ui--ux-deficiencies-broken-features--typos)
6. [ESLint, TypeScript & React 19 Compiler Errors](#6-eslint-typescript--react-19-compiler-errors)
7. [Prioritized Remediation Roadmap](#7-prioritized-remediation-roadmap)

---

## 1. Security Vulnerabilities (Critical & High)

### 1.1 Unauthenticated Remote Code Execution (RCE) on Host OS (CVSS 10.0 - CRITICAL)
- **Files Affected:**
  - `routes.ts` (Lines 7–12)
  - `middleware.ts` (Lines 11–28)
  - `app/api/execute/run/route.ts` (Lines 29–649)
  - `app/api/execute/stdin/route.ts` (Lines 6–41)
  - `app/api/execute/stop/route.ts` (Lines 6–23)
- **Issue:**
  In `routes.ts`, the execution endpoints are explicitly declared inside `publicRoutes`:
  ```ts
  export const publicRoutes: string[] = [
      "/api/settings/diagnostics",
      "/api/execute/run",
      "/api/execute/stdin",
      "/api/execute/stop",
  ]
  ```
  Because `middleware.ts` permits all routes in `publicRoutes` without a session, any anonymous internet client or automated bot can send a `POST` request to `/api/execute/run`.
  Inside `app/api/execute/run/route.ts`, there is **no session check or user authorization**. The endpoint writes the supplied code to disk in the OS temporary directory and executes `g++`, `gcc`, `javac`, `java`, or `python` directly on the host machine using Node.js `child_process.spawn()`.
- **Impact:**
  Complete host machine compromise. An attacker can write malicious Python/C++/C/Java scripts (e.g. `import os; os.system("...")`) to read all environment variables (`DATABASE_URL`, `AUTH_SECRET`, OAuth client secrets), read/write/delete any file on the server, establish reverse shells, or use the host for denial-of-service/crypto mining.
- **Remediation:**
  - Remove execution endpoints from `publicRoutes`.
  - Validate user session inside route handlers using `await auth()`.
  - Execute untrusted code inside an isolated sandbox (Docker containers, gVisor, or remote microVMs like Firecracker/Piston/Judge0), never natively on the host server.

---

### 1.2 Insecure Direct Object Reference (IDOR) & Broken Object-Level Authorization (HIGH)
- **Files Affected:**
  - `features/dashboard/actions/index.ts` (Lines 64–78, 81–107, 109–143)
  - `features/playground/actions/index.ts` (Lines 28–48, 50–68)
- **Issue:**
  The server actions perform database operations without verifying project ownership:
  1. **`deleteProjectById(id)`**: Deletes `db.playground.delete({ where: { id } })` without checking if `currentUser()` owns the project. Any authenticated user can delete any other user's playground by supplying its ID.
  2. **`editProjectById(id, data)`**: Updates title and description without verifying ownership.
  3. **`duplicateProjectById(id)`**: Does not verify access to the source project.
  4. **`SaveUpdatedCode(playgroundId, data)`**: Upserts `templateFiles` matching only `where: { playgroundId }`. Any authenticated user can overwrite code inside any user's playground.
  5. **`updatePlaygroundTemplate(playgroundId, newTemplate)`**: Changes the template of any playground without ownership verification.
- **Impact:**
  Unauthorized modification, data destruction, and unauthorized code overwriting across all users.
- **Remediation:**
  Always enforce ownership check:
  ```ts
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");
  const playground = await db.playground.findFirst({ where: { id, userId: user.id } });
  if (!playground) throw new Error("Forbidden");
  ```

---

### 1.3 Duplicate Project Assigns Cloned Playground to Original Owner (HIGH)
- **File Affected:** `features/dashboard/actions/index.ts` (Lines 123–130)
- **Issue:**
  In `duplicateProjectById`:
  ```ts
  const duplicatedPlayground = await db.playground.create({
    data: {
      title: `${originalPlayground.title} (Copy)`,
      description: originalPlayground.description,
      template: originalPlayground.template,
      userId: originalPlayground.userId, // <--- WRONG
    },
  });
  ```
  If User A duplicates User B's project (or a shared project), the newly created playground is attached to User B (`originalPlayground.userId`), not the user performing the duplicate action.
- **Remediation:**
  Set `userId: user.id` from `await currentUser()`.

---

### 1.4 Command / Argument Injection via Java `mainClass` (HIGH)
- **File Affected:** `app/api/execute/run/route.ts` (Lines 325–328)
- **Issue:**
  The `mainClass` string sent in the JSON body is passed directly as a command-line argument to `java`:
  ```ts
  const runProcess = spawn("java", ["-cp", binDir, mainClass], { cwd: tempDir });
  ```
  If an attacker provides a `mainClass` string starting with a hyphen (such as `-agentlib:...`, `-javaagent:...`, or `-D...`), the JVM treats it as a JVM startup flag rather than a class name.
- **Remediation:**
  Validate `mainClass` using a strict regex: `/^[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/` before passing it to `spawn`.

---

### 1.5 Malformed Environment Variable Syntax in `.env` (MEDIUM)
- **File Affected:** `.env` (Line 6)
- **Issue:**
  Line 6 contains a space before the equals sign:
  ```env
  AUTH_GITHUB_ID =Ov23liIl6qLdAuZ0s3nn
  ```
  Standard POSIX/dotenv parsers parse this key as `"AUTH_GITHUB_ID "` (including the trailing space), making `process.env.AUTH_GITHUB_ID` resolve to `undefined`. This causes GitHub OAuth login to fail silently.
- **Remediation:**
  Remove the space before `=`: `AUTH_GITHUB_ID=Ov23liIl6qLdAuZ0s3nn`.

---

### 1.6 Private GitHub Emails Cause Unhandled Crash in Auth Callback (MEDIUM)
- **File Affected:** `auth.ts` (Lines 14–16, 21)
- **Issue:**
  In the `signIn` callback:
  ```ts
  const existinguser = await db.user.findUnique({
    where: { email: user.email! }
  });
  ```
  If a user signs in via GitHub and has their primary email set to "Private", GitHub OAuth does not include an email in the profile payload. `user.email!` evaluates to `undefined`, causing Prisma's MongoDB query to throw `Argument 'email' must not be null/undefined`, failing authentication with a 500 error.
- **Remediation:**
  Verify `user.email` exists before running the query; if absent, request the `user:email` scope and query GitHub's `/user/emails` API.

---

## 2. Architecture, Runtime & Cloud Incompatibilities

### 2.1 OS-Lock-in: Windows-Only Process Termination (`taskkill`) (HIGH)
- **File Affected:** `lib/process-registry.ts` (Lines 25–37)
- **Issue:**
  `killProcessTree` hardcodes the Windows `taskkill` binary:
  ```ts
  exec(`taskkill /pid ${pid} /T /F`, () => { resolve(); });
  ```
  If this application is deployed on Linux or macOS (e.g. Vercel, Docker, AWS EC2/ECS, Render, Fly.io), `taskkill` does not exist. Process termination and timeouts fail silently, leaving zombie processes running indefinitely on the host.
- **Remediation:**
  Detect the platform (`process.platform === "win32"` vs POSIX) or use a cross-platform package like `tree-kill`.

---

### 2.2 Hardcoded `.exe` Binary Execution Breaks Linux/macOS (HIGH)
- **File Affected:** `app/api/execute/run/route.ts` (Lines 135, 182, 416, 463)
- **Issue:**
  The C and C++ compilers hardcode the output binary as:
  ```ts
  const exeName = "main.exe";
  const exePath = path.join(tempDir, exeName);
  const runProcess = spawn(exePath, [], { ... });
  ```
  On Linux and macOS, GCC/G++ output ELF/Mach-O binaries without `.exe`. Furthermore, on UNIX, newly compiled binaries require executable permissions (`chmod +x`). Running `spawn("main.exe")` on Linux fails immediately with `ENOENT` or `EACCES`.
- **Remediation:**
  Use `process.platform === "win32" ? "main.exe" : "./main"` and ensure executable mode on UNIX.

---

### 2.3 Race Condition & Read-Only Filesystem Failure in Template Generation (HIGH)
- **File Affected:** `app/api/template/[id]/route.ts` (Lines 46–60)
- **Issue:**
  When loading template files for a playground, the handler writes to a static file in the project directory:
  ```ts
  const outputFile = path.join(process.cwd(), `output/${templateKey}.json`);
  await saveTemplateStructureToJson(inputPath, outputFile);
  const result = await readTemplateStructureFromJson(outputFile);
  await fs.unlink(outputFile);
  ```
  1. **Race Condition:** If two users (or the same user in multiple tabs) open playgrounds of the same template simultaneously, both requests write, read, and delete `output/REACT.json` concurrently. One request deletes the file while the other is reading it, throwing `ENOENT: no such file or directory`.
  2. **Cloud/Serverless Crash:** In production serverless environments (e.g. Vercel Lambda), `process.cwd()` is mounted on a read-only filesystem. Calling `fs.writeFile` to `process.cwd()/output` throws `EROFS: read-only file system`.
- **Remediation:**
  Perform directory scanning and JSON tree construction purely in memory using `scanTemplateDirectory()`, without writing intermediary JSON files to disk.

---

### 2.4 Safari & WebKit Incompatibility with WebContainer COEP (HIGH)
- **Files Affected:**
  - `next.config.ts` (Lines 26–28)
  - `features/execution/services/providers/webcontainer-provider.ts` (Lines 21–26, 28)
  - `app/playground/[id]/page.tsx` (Lines 207–224)
- **Issue:**
  `next.config.ts` sets `Cross-Origin-Embedder-Policy: credentialless`. Safari (iOS & macOS) does **not** support COEP `credentialless`. In Safari, `window.crossOriginIsolated` remains `false`.
  In `app/playground/[id]/page.tsx`, when `window.crossOriginIsolated` is `false`, the code triggers `window.location.reload()`. This causes an infinite reload loop on Safari until sessionStorage stops it, after which WebContainer crashes with:
  `Browser cross-origin isolation is not active (window.crossOriginIsolated === false).`
- **Remediation:**
  Use `Cross-Origin-Embedder-Policy: require-corp` with appropriate `Cross-Origin-Resource-Policy` headers, and provide a clear fallback/notice for unsupported browsers instead of calling `window.location.reload()`.

---

### 2.5 In-Memory Process Registry Is Lost in Production / Serverless (MEDIUM)
- **File Affected:** `lib/process-registry.ts` (Lines 15–20)
- **Issue:**
  ```ts
  export const activeProcesses =
    globalForRegistry.processRegistry ?? new Map<string, ActiveProcess>();

  if (process.env.NODE_ENV !== "production") {
    globalForRegistry.processRegistry = activeProcesses;
  }
  ```
  In production, `activeProcesses` is not saved to `globalThis`. If route handlers are bundled separately or module re-evaluation occurs, `/api/execute/stdin` and `/api/execute/stop` receive a separate, empty `Map`, failing to find running processes. In serverless environments, state across separate HTTP requests cannot be preserved in Node process memory.
- **Remediation:**
  Preserve `processRegistry` on `globalThis` regardless of `NODE_ENV`, or handle executions via persistent WebSocket/SSE long-lived connections.

---

### 2.6 Next.js 16 Deprecated Convention: `middleware.ts` (MEDIUM)
- **File Affected:** `middleware.ts`
- **Issue:**
  Next.js 16.3.0 flags `middleware.ts` as deprecated:
  `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
- **Remediation:**
  Run `npx @next/codemod@canary middleware-to-proxy .` to migrate to the Next.js 16 proxy convention.

---

## 3. Core Application & Workbench Logic Bugs

### 3.1 `generateFileId` Path Duplication Bug (HIGH)
- **File Affected:** `features/playground/lib/index.ts` (Lines 28–40)
- **Issue:**
  `findFilePath(file, rootFolder)` already returns the full relative path including filename and extension (e.g. `src/components/Button.tsx`).
  However, `generateFileId` appends the filename and extension a second time:
  ```ts
  export const generateFileId = (file: TemplateFile, rootFolder: TemplateFolder): string => {
    const path = findFilePath(file, rootFolder)?.replace(/^\/+/, '') || '';
    const extension = file.fileExtension?.trim();
    const extensionSuffix = extension ? `.${extension}` : '';

    return path
      ? `${path}/${file.filename}${extensionSuffix}`
      : `${file.filename}${extensionSuffix}`;
  }
  ```
  For a file at `src/Button.tsx`, `path` is `"src/Button.tsx"`. `generateFileId` produces `"src/Button.tsx/Button.tsx"`.
- **Impact:**
  Corrupts file tab keys, breaks active file lookup, causes snapshot discrepancies, and causes renaming/closing operations to fail.
- **Remediation:**
  Return `path` directly if found: `return path || `${file.filename}${extensionSuffix}`;`.

---

### 3.2 Filename Collision Bug Across Folders (HIGH)
- **File Affected:** `features/playground/lib/index.ts` (Lines 13–21)
- **Issue:**
  `findFilePath` searches the tree by matching only `item.filename` and `item.fileExtension`:
  ```ts
  if (item.filename === file.filename && item.fileExtension === file.fileExtension) {
    return [...pathSoFar, item.filename + (item.fileExtension ? "." + item.fileExtension : "")].join("/");
  }
  ```
  Because `TemplateFile` does not carry an ID or parent path, if a project contains two files with the same name in different folders (e.g. `src/index.ts` and `server/index.ts` or `button/styles.css` and `modal/styles.css`), `findFilePath` **always matches and returns the first one found**.
- **Impact:**
  Clicking `server/index.ts` opens `src/index.ts`. Editing `server/index.ts` saves into `src/index.ts`. Deleting `server/index.ts` deletes `src/index.ts`.
- **Remediation:**
  Include unique IDs or full relative path references on `TemplateFile` objects.

---

### 3.3 Python Source Files Filtered Out by Snapshot (HIGH)
- **File Affected:** `features/execution/lib/snapshot.ts` (Lines 74–76)
- **Issue:**
  `createProjectSnapshot` filters source files with:
  ```ts
  const sourceFiles = Object.keys(flattenedFiles).filter((filePath) =>
    /\.(cpp|cc|cxx|c|java)$/i.test(filePath)
  );
  ```
  `.py` files are **omitted** from `sourceFiles`.
  In `app/api/execute/run/route.ts` (Line 543):
  ```ts
  const pyFiles = sourceFiles.filter((f) => /\.py$/i.test(f));
  ```
  `pyFiles` is always empty `[]`. Unless the active file happens to end with `.py` or a file is named exactly `main.py` in the root folder, Python execution aborts with:
  `Error: No Python source file (.py) found to execute.`
- **Remediation:**
  Add `py` to the regex: `/\.(cpp|cc|cxx|c|java|py)$/i`.

---

### 3.4 Destructive Auto-Switch Language Side-Effect on File Click (HIGH)
- **File Affected:** `app/playground/[id]/page.tsx` (Lines 247–278)
- **Issue:**
  When a user opens or selects a file in the file tree:
  ```ts
  const detected = detectLanguageFromFilename(activeFile.filename, activeFile.fileExtension, baseTemplate);
  if (detected && detected !== activeTemplate) {
    updatePlaygroundTemplate(id, detected).catch(console.error);
    toast.info(`Language set to ${detected} for .${activeFile.fileExtension}`);
  }
  ```
  If a user creates or clicks on an `.html` file inside an Express, Python, or Vue project, `detectLanguageFromFilename` returns `"REACT"`. This **automatically mutates the project template in the database to REACT** and switches the execution engine without user consent.
- **Impact:**
  Opening config/helper files corrupts the project's runtime environment.
- **Remediation:**
  Language selection should only change Monaco editor syntax highlighting, not mutate the persistent project template in the database.

---

### 3.5 Duplicate Project Fails to Clone Project Files (HIGH)
- **File Affected:** `features/dashboard/actions/index.ts` (Lines 122–130)
- **Issue:**
  `duplicateProjectById` only copies the `Playground` row:
  ```ts
  await db.playground.create({
    data: {
      title: `${originalPlayground.title} (Copy)`,
      description: originalPlayground.description,
      template: originalPlayground.template,
      userId: originalPlayground.userId,
    }
  });
  ```
  It does not copy the corresponding `TemplateFiles` row. The duplicated playground is initialized with empty files.
- **Remediation:**
  Query `templateFiles` of the original project and create a clone record for the new playground.

---

### 3.6 Incomplete Java `main()` Method Detection (MEDIUM)
- **File Affected:** `features/execution/lib/java-detector.ts` (Line 7)
- **Issue:**
  ```ts
  const MAIN_METHOD_REGEX =
    /public\s+static\s+void\s+main\s*\(\s*String\s*(?:\[\s*\]\s*\w+|\w+\s*\[\s*\])\s*\)/;
  ```
  This regex does not match:
  1. Varargs: `public static void main(String... args)`
  2. Modifiers: `public static void main(final String[] args)`
  3. Java 21+ instance mains: `void main()`
- **Impact:**
  Valid Java programs fail to run with: `No runnable main method found`.
- **Remediation:**
  Expand regex: `/public\s+static\s+void\s+main\s*\(\s*(?:final\s+)?String(?:\s*\[\s*\]\s*\w+|\s+\w+\s*\[\s*\]|\s*\.\.\.\s*\w+)\s*\)/`.

---

### 3.7 Monaco Editor Model Collision & Lost Undo/Redo History (MEDIUM)
- **File Affected:** `features/playground/components/playground-editor.tsx` (Lines 72–77)
- **Issue:**
  `<Editor>` does not specify the `path` prop. When users switch between open files, Monaco reuses the same underlying text model.
- **Impact:**
  Switching files destroys the undo/redo stack (`Ctrl+Z`), clears editor bookmarks/markers, and can cause cursor jumping.
- **Remediation:**
  Pass `path={activeFile ? `${activeFile.filename}.${activeFile.fileExtension}` : "default"}` to `<Editor>`.

---

### 3.8 Inability to Create Dotfiles in File Explorer (MEDIUM)
- **File Affected:** `features/playground/components/template-file-tree.tsx` (Lines 305–309)
- **Issue:**
  ```ts
  const lastDot = cleanName.lastIndexOf(".");
  if (lastDot > 0) {
    cleanExt = cleanName.substring(lastDot + 1);
    cleanName = cleanName.substring(0, lastDot);
  }
  ```
  For dotfiles (e.g. `.gitignore`, `.env`, `.prettierrc`), `lastDot` is `0`. Because the check is `lastDot > 0`, the condition fails and the dialog defaults `cleanExt` to `"js"`, creating `.gitignore.js` or `.env.js`.
- **Remediation:**
  Handle leading dots explicitly when parsing filenames and extensions.

---

### 3.9 EventEmitter Memory Leak in WebContainer (MEDIUM)
- **Files Affected:**
  - `features/execution/services/providers/webcontainer-provider.ts` (Line 104)
  - `features/webContainers/hooks/useWebContainer.ts` (Line 37)
- **Issue:**
  Each time `run()` is executed or `useWebContainer` mounts, a new `instance.on("server-ready", ...)` listener is registered on the persistent WebContainer singleton without ever being cleaned up.
- **Impact:**
  Node/browser `MaxListenersExceededWarning` and multiple duplicate callback executions on server start.
- **Remediation:**
  Unregister listeners on cleanup or manage a single listener that dispatches through a centralized store.

---

### 3.10 False Success Notifications on Server Action Failures (MEDIUM)
- **Files Affected:**
  - `features/playground/actions/index.ts` (Lines 45–47)
  - `features/playground/hooks/usePlayground.tsx` (Lines 76–85)
  - `features/dashboard/actions/components/add-new-button.tsx` (Lines 26–41)
- **Issue:**
  `SaveUpdatedCode` catches database errors, logs them to console, and returns `undefined` without re-throwing. In `usePlayground.tsx`, `saveTemplateData` awaits `SaveUpdatedCode` and immediately triggers `toast.success("Changes saved successfully")` even when the database query failed completely. Similarly, `AddNewButton` displays success even when `createPlayground` returns null.
- **Remediation:**
  Return `{ success: boolean, error?: string }` from all server actions and verify `res.success` before displaying success toasts.

---

### 3.11 Stopping Process During `npm install` Is Impossible (MEDIUM)
- **File Affected:** `features/execution/services/providers/webcontainer-provider.ts` (Lines 132, 284–294)
- **Issue:**
  `this.activeProcess` is only assigned at Line 173 (`npm run dev`). During dependency installation (Line 132: `instance.spawn("npm", ["install"])`), `this.activeProcess` is null. Clicking "Stop" does nothing while `npm install` runs.
- **Remediation:**
  Assign `this.activeProcess = installProcess` during the installation phase.

---

## 4. Database Schema & Data Integrity Issues

### 4.1 Missing Timestamps on `Playground` Schema Model (MEDIUM)
- **Files Affected:**
  - `prisma/schema.prisma` (Lines 67–79)
  - `features/dashboard/actions/components/project-table.tsx` (Lines 342, 385–387)
- **Issue:**
  The `Playground` model in `prisma/schema.prisma` has no `createdAt` or `updatedAt` fields:
  ```prisma
  model Playground {
    id String @id @default(cuid()) @map("_id")
    title String?
    description String?
    template Templates @default(REACT)
    Starmark Starmark[]
    userId String
    user User @relation(fields:[userId], references:[id], onDelete:Cascade)
    templateFiles TemplateFiles[]
  }
  ```
  In `project-table.tsx`:
  ```ts
  const projectDate = new Date(project.createdAt);
  ```
  `project.createdAt` is always `undefined`. The "Created" column in the dashboard project table permanently displays "—" for every single project.
- **Remediation:**
  Add `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt` to the `Playground` model in `schema.prisma` and re-generate the Prisma client.

---

### 4.2 Dashboard Starred State Never Synchronized (MEDIUM)
- **Files Affected:**
  - `features/dashboard/actions/components/project-table.tsx` (Lines 121, 344)
  - `features/dashboard/actions/components/dashboard-sidebar.tsx` (Lines 65–70)
- **Issue:**
  1. In `project-table.tsx`, `favorites` state is initialized to `{}`:
     ```ts
     const [favorites, setFavorites] = useState<Record<string, boolean>>({});
     const isFavorite = favorites[project.id] || false;
     ```
     It completely ignores `project.Starmark?.[0]?.isMarked`. On page load/refresh, all stars display as un-starred.
  2. In `dashboard-sidebar.tsx`, `starredPlaygrounds` is stored in local state initialized once from props and never updated when props change. Toggling a favorite in the table never updates the sidebar.
- **Remediation:**
  Initialize `favorites` from `projects.reduce(...)` mapping `project.Starmark?.[0]?.isMarked`, and synchronize sidebar state via `useEffect` or Zustand.

---

### 4.3 Redundant User/Account Creation in `auth.ts` (MEDIUM)
- **File Affected:** `auth.ts` (Lines 18–72, 104)
- **Issue:**
  `auth.ts` specifies `adapter: PrismaAdapter(db)` on Line 104, yet the `signIn` callback on Lines 18–72 manually duplicates user and account creation with raw Prisma queries. Having both causes duplicate account link attempts, unique constraint collisions, and race conditions.
- **Remediation:**
  Let `@auth/prisma-adapter` handle user/account creation, using callbacks only for supplemental data enrichment.

---

### 4.4 Unsafe Non-Null Assertion in `createPlayground` (LOW)
- **File Affected:** `features/dashboard/actions/index.ts` (Line 23)
- **Issue:**
  ```ts
  userId: user?.id!
  ```
  If `user` is null, `user?.id!` evaluates to `undefined`, violating TypeScript conventions and causing Prisma to crash with a validation error.
- **Remediation:**
  Check `if (!user?.id) throw new Error("Unauthorized");`.

---

## 5. UI / UX Deficiencies, Broken Features & Typos

### 5.1 Fake Feature: "Open Github Repository" Stub (LOW)
- **File Affected:** `features/dashboard/actions/components/add-repo.button.tsx` (Line 14)
- **Issue:**
  The "Open Github Repository" card has:
  ```tsx
  onClick={() => { window.location.href = "https://github.com"; }}
  ```
  Clicking the button redirects the browser to `https://github.com` instead of importing or cloning a repository.
- **Remediation:**
  Implement a repository import modal or mark the card as "Coming Soon" with a disabled state.

---

### 5.2 Missing "Coffee" Icon in `DashboardSidebar` (LOW)
- **Files Affected:**
  - `app/dashboard/layout.tsx` (Line 20)
  - `features/dashboard/actions/components/dashboard-sidebar.tsx` (Lines 48–56)
- **Issue:**
  `app/dashboard/layout.tsx` assigns the `"Coffee"` icon for Java projects: `JAVA: "Coffee"`. However, `DashboardSidebar` does not import `Coffee` or list it in `lucideIconMap`. It falls back to `Code2` for Java playgrounds.
- **Remediation:**
  Import `Coffee` from `lucide-react` and add it to `lucideIconMap`.

---

### 5.3 Missing "Sign In" Button for Unauthenticated Visitors (LOW)
- **File Affected:** `features/auth/components/user-button.tsx` (Lines 15–28)
- **Issue:**
  When `session?.user` is null, `UserButton` still renders an avatar with fallback "U" and a "LogOut" menu item instead of providing a "Sign In" link.
- **Remediation:**
  Render a "Sign In" button when `!session?.user`.

---

### 5.4 Theme Toggle Fails on "System" Theme & Causes Hydration Shift (LOW)
- **File Affected:** `components/ui/theme-toggle.tsx` (Lines 16–19)
- **Issue:**
  If the active theme is `"system"`, clicking the toggle sets theme to `"dark"`. Line 18 evaluates `theme === "light"`, rendering a Sun icon for system dark mode. Additionally, returning `null` before mount causes a layout shift.
- **Remediation:**
  Use `resolvedTheme` from `useTheme()` instead of `theme`.

---

### 5.5 Typos in Dashboard & Landing Page (LOW)
- **Files Affected:**
  - `app/(root)/page.tsx` (Line 15): Typo in hero heading: `"Code Editor With with Intelligence"` ("With with").
  - `app/(root)/page.tsx` (Line 12): `<Image src={"hero.svg"} ... />` missing leading slash (`"/hero.svg"`).
  - `app/dashboard/page.tsx` (Line 13): Tailwind class typo `gird-cols-1` instead of `grid-cols-1`.
  - `app/dashboard/page.tsx` (Line 18): Tailwind class typo `intems-center` instead of `items-center`.
  - `features/dashboard/actions/components/project-table.tsx` (Line 622): Typo `"Are your sure you want to delete"`.
  - `app/dashboard/layout.tsx` (Line 28): Typo fallback title `"utitled"` instead of `"untitled"`.

---

### 5.6 Unnecessary 4.3 MB Binary Zip File Tracked in Git (LOW)
- **File Affected:** `code-starters.zip` (Workspace root)
- **Issue:**
  A 4,315,794 byte zip archive (`code-starters.zip`) is committed and tracked in git while the extracted folder `starters-main` also exists. This bloats repository clone sizes.
- **Remediation:**
  Add `*.zip` to `.gitignore` and remove `code-starters.zip` from git tracking using `git rm --cached`.

---

### 5.7 C Template Selection Uses C++ Icon (LOW)
- **File Affected:** `features/dashboard/actions/components/template-selection-modal.tsx` (Line 191)
- **Issue:**
  The C language option reuses the C++ icon `/cpp.jpg`.
- **Remediation:**
  Provide a dedicated C icon (e.g. `/c.svg`).

---

## 6. ESLint, TypeScript & React 19 Compiler Errors

Running `npm run lint` generates **107 problems (65 errors, 42 warnings)** that prevent clean builds:

### 6.1 React 19 `react-hooks/set-state-in-effect` (65 Errors)
Calling `setState` synchronously within `useEffect` bodies causes cascading renders in React 19.
- `features/playground/hooks/usePlayground.tsx:89:5`: `loadPlayground()`
- `features/settings/components/settings-view.tsx:111:5`: `loadDiagnostics()`
- `features/settings/hooks/useEditorSettings.ts:56:5`: `setSettings(...)`
- `features/settings/hooks/useTerminalSettings.ts:38:5`: `setSettings(...)`
- `features/dashboard/actions/components/project-table.tsx:124:5`: `setProjectList(...)`
- `features/playground/components/template-file-tree.tsx:276:7` & `434:7`: `setFilename(...)`
- `app/playground/[id]/page.tsx:137:7, 181:11, 229:7, 262:7`: `setCurrentPlayground`, `setSidebarDefaultSize`, `setActiveBottomTab`
- `components/ui/carousel.tsx:98:5`: `onSelect(api)`
- `components/ui/theme-toggle.tsx:11:20`: `setMounted(true)`
- `hooks/use-mobile.ts:14:5`: `setIsMobile(...)`

### 6.2 Unescaped Entities & Comments in JSX
- `app/playground/[id]/page.tsx:902:51`: Unescaped double quotes `"` in JSX prose (`react/no-unescaped-entities`).
- `features/dashboard/actions/components/project-table.tsx:624:17`: Unescaped `"` in JSX description.
- `features/settings/components/settings-view.tsx:387:50`: Raw `//` comment inside JSX child tag (`react/jsx-no-comment-textnodes`).

### 6.3 `@ts-ignore` instead of `@ts-expect-error`
- `app/playground/[id]/page.tsx:475:10` & `741:24`: `@typescript-eslint/ban-ts-comment` error.
- `features/playground/components/playground-editor.tsx:78:9`: `@typescript-eslint/ban-ts-comment` error.

### 6.4 `prefer-const` Errors
- `features/execution/components/playground-terminal.tsx:267:17` & `294:17`: `let nextIdx` is never reassigned.

---

## 7. Prioritized Remediation Roadmap

| Priority | Issue / Fix | Affected Layer | Impact |
| :--- | :--- | :--- | :--- |
| **P0** | Remove `/api/execute/*` from `publicRoutes`, add auth checks, and isolate native compiler execution | Security / API | Prevents full host RCE |
| **P0** | Add user ownership checks to all playground server actions (`delete`, `edit`, `save`, `duplicate`) | Security / DB | Fixes critical IDOR vulnerabilities |
| **P1** | Fix `generateFileId` path duplication and filename collision across folders | Core Workbench | Fixes corrupted file tabs & file explorer |
| **P1** | Include `.py` in `snapshot.ts` sourceFiles filter | Execution Engine | Restores Python code runner |
| **P1** | Remove destructive auto-switch template DB mutation on file selection | UI / Editor | Prevents unwanted project re-configurations |
| **P1** | Eliminate filesystem write in `/api/template/[id]` (scan in-memory) | API / Stability | Fixes race condition & serverless crashes |
| **P1** | Add `createdAt` and `updatedAt` to `Playground` in `prisma/schema.prisma` | DB / Dashboard | Fixes broken "Created" date column |
| **P2** | Fix Windows-only `taskkill` and `.exe` hardcoding | Architecture | Enables cross-platform & Docker deployments |
| **P2** | Clean up WebContainer singleton `server-ready` event listeners | Runtime Engine | Resolves memory leak & multiple triggers |
| **P2** | Pass `path` prop to Monaco `<Editor>` | Editor UX | Preserves per-file undo/redo stack & markers |
| **P2** | Fix `.env` key whitespace (`AUTH_GITHUB_ID`) | Configuration | Restores GitHub OAuth authentication |
| **P3** | Fix all 107 ESLint errors (unescaped entities, React 19 effect sets, `prefer-const`) | Code Quality | Unblocks strict CI/CD pipeline |
| **P3** | Correct typos (`gird-cols-1`, `intems-center`, "With with", missing icons) | UI Polish | Improves application presentation |

---
*Report generated strictly following non-modifying audit protocols. No codebase files were altered.*
