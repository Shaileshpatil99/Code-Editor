# ⚡ CloudCode Studio (Full-Stack Web & Multi-Language Cloud IDE)

A high-performance, browser-based integrated development environment (IDE) built with **Next.js 16**, **React 19**, **Monaco Editor**, **WebContainers**, and a **Native Real-Time Execution Engine** for compiled & interpreted languages (C, C++, Java, Python).

---

## 🌟 Architecture & Key Features

### 1. 🖥️ Advanced Code Editor (Monaco)
- **Engine**: Powered by VS Code's core engine (`@monaco-editor/react`).
- **Features**: Multi-file tab management, dynamic language detection, syntax highlighting, bracket pair colorization, customizable font size, tab sizing, and themes.
- **Workflow Integrations**: Native keyboard shortcut interception (`Ctrl+S` / `Cmd+S`) for cloud persistence without triggering browser page-save dialogs.

### 2. ⚡ Hybrid Execution Architecture
CloudCode Studio utilizes a dual-engine architecture to support both modern web development stacks and systems programming:
- **In-Browser WebContainers**:
  - Runs full Node.js runtime environments directly inside the browser using WebAssembly and Web Workers.
  - Features real-time live preview with cross-origin isolation (`COOP`/`COEP`).
  - Integrated with `@xterm/xterm` for interactive terminal sessions with npm scripts and shell commands.
- **Server-Side Native Execution (C, C++, Python, Java)**:
  - Real-time streaming output over Server-Sent Events (SSE) via `/api/execute/run`.
  - Bidirectional interactive execution support (standard input stream over `/api/execute/stdin`).
  - Process lifecycle management and abort control (`/api/execute/stop`) with OS-level process tree termination (`taskkill` on Windows, `SIGKILL` on Unix).
  - Smart Java entrypoint analysis and automatic main class detection.
  - Active-file execution routing ensuring the currently focused tab runs seamlessly.

### 3. 📂 Virtual File System & Starter Templates
- Full hierarchical tree explorer: create, rename, delete files and directories.
- Starter template library supporting:
  - **Systems & Scripting**: C, C++, Python, Java
  - **Modern Web**: Next.js, React (Vite), Svelte, Qwik, Astro, HTML/CSS/JS
- Project cloning and state duplication across workspaces.

### 4. 🔐 Security & Identity
- Authenticated with **Auth.js (NextAuth v5)** via GitHub OAuth.
- Strict route protection via Next.js Proxy/Middleware.
- Protected Server Actions ensuring strict multi-tenant playground ownership.
- Isolated process registry preventing cross-tenant process leaks or unauthorized execution signals.

### 5. 🗄️ Database & State Persistence
- **ORM**: Prisma ORM with custom client generation (`./lib/generated/prisma`).
- **Database**: MongoDB for distributed schema storage of users, sessions, playground workspaces, and file snapshots.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Frontend** | [React 19](https://react.dev/), TypeScript, Tailwind CSS |
| **UI Components** | Radix UI primitives, Lucide Icons, Sonner Toasts |
| **Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Terminal** | [xterm.js](https://xtermjs.org/) (`@xterm/xterm`, addons: fit, web-links) |
| **Runtimes** | StackBlitz WebContainers, Node.js Native Process Spawner |
| **Authentication** | [Auth.js / NextAuth v5](https://authjs.dev/) |
| **Database & ORM** | [Prisma](https://www.prisma.io/) & [MongoDB](https://www.mongodb.com/) |

---

## 📂 Project Structure

```text
├── app/                        # Next.js App Router
│   ├── (root)/                 # Landing page & marketing views
│   ├── api/                    # API Endpoints
│   │   ├── auth/               # NextAuth authentication handlers
│   │   ├── execute/            # Streaming code runner (run, stdin, stop)
│   │   ├── settings/           # System diagnostics & telemetry
│   │   └── template/           # Dynamic starter templates loader
│   ├── dashboard/              # User dashboard & project management
│   ├── docs/                   # Interactive developer documentation
│   ├── playground/[id]/        # Core Cloud IDE workspace
│   └── settings/               # User preferences & editor settings
├── components/                 # Global UI & shared design system
├── features/                   # Feature-based modular architecture
│   ├── auth/                   # Authentication forms, session buttons
│   ├── dashboard/              # Project tables, template pickers, modals
│   ├── execution/              # Terminals, action bars, native runners
│   ├── playground/             # Monaco wrapper, file tree, layout manager
│   ├── settings/               # Terminal & editor setting controllers
│   └── webContainers/          # WebContainer bootstrapper & hooks
├── lib/                        # Core utilities, Prisma client, process registry
├── prisma/                     # Database schema definition
└── starters-main/              # Pre-packaged runtime starter templates
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or later
- **Package Manager**: `npm`, `pnpm`, or `bun`
- **Compilers (Optional for local C/C++/Java/Python execution)**:
  - `g++` / `gcc` (MinGW or Linux build-essential)
  - `python` (Python 3.10+)
  - `javac` & `java` (OpenJDK 17+)
- **MongoDB**: A running MongoDB instance or MongoDB Atlas cluster.

### 1. Clone & Install
```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
npm install
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your actual configuration:
```env
# MongoDB Connection String
DATABASE_URL="mongodb+srv://<username>:<password>@cluster.mongodb.net/code_editor?retryWrites=true&w=majority"

# NextAuth / Auth.js Configuration
AUTH_SECRET="your-generated-secret"
AUTH_GITHUB_ID="your_github_oauth_app_id"
AUTH_GITHUB_SECRET="your_github_oauth_app_secret"

# Application Base URL
NEXTAUTH_URL="http://localhost:3000"
```

> **Tip**: Generate a secure `AUTH_SECRET` by running:
> ```bash
> openssl rand -base64 32
> ```

### 3. Generate Database Client
```bash
npx prisma generate
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing, Quality & Production Build

Verify linting, type definitions, and compilation before pushing to production:

```bash
# Type Check
npx tsc --noEmit

# Code Linting
npm run lint

# Production Build
npm run build
```

---

## 🚢 Deployment Guide

### Deploying on Vercel
1. Push your repository to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Under **Environment Variables**, add:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_GITHUB_ID`
   - `AUTH_GITHUB_SECRET`
   - `NEXTAUTH_URL` (your production Vercel URL)
4. Deploy! Prisma client generation is automatically handled via `package.json`'s `postinstall` script.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for details.
