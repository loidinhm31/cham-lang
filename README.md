# Cham Lang

An **offline-first vocabulary learning app** with intelligent spaced repetition. Supports web, desktop (Tauri v2), and Android platforms. Embeddable in [glean-oak-app](../../glean-oak-app) via Shadow DOM.

**Version:** 0.4.1 | **Status:** Active Development

## Quick Features

| Feature | Details |
|---------|---------|
| **Vocabulary CRUD** | Words with definitions, IPA, audio, examples, topics, tags, related words |
| **Collections** | Language-specific organization + read-only sharing |
| **Practice Modes** | Flashcard, Fill Word, Multiple Choice + Study Mode (untracked) |
| **Spaced Repetition** | SM-2, Modified SM-2, Simple Doubling + Leitner boxes (3/5/7) |
| **Sync** | Checkpoint-based offline-first sync with glean-oak-server |
| **Google Drive Backup** | Export/restore entire database |
| **Daily Reminders** | Notifications with persistent scheduling (WorkManager on Android) |
| **6 Themes** | Light, Dark, Chameleon, Simple, Cyber, System + CSS custom properties |
| **i18n** | English + Vietnamese UI translations |
| **Multi-Platform** | Web, Desktop (Tauri), Android |

## Quick Start

```bash
# Install
pnpm install

# Develop
pnpm dev:web          # Web: http://localhost:5173
pnpm dev:tauri        # Desktop app
pnpm tauri android dev # Android device/emulator

# Build
pnpm build            # All packages
pnpm test             # Vitest watch
pnpm lint && pnpm format
```

## Documentation

| Document | Purpose |
|----------|---------|
| [`docs/architecture.md`](docs/architecture.md) | **Required reading** — State machines, dataflow, invariants, schema |
| [`docs/system-architecture.md`](docs/system-architecture.md) | High-level layers, patterns, embeddability, themes |
| [`docs/code-standards.md`](docs/code-standards.md) | Naming, components, services, anti-patterns, testing |
| [`docs/codebase-summary.md`](docs/codebase-summary.md) | File inventory, LOC estimates, tech stack, key files |
| [`docs/project-overview-pdr.md`](docs/project-overview-pdr.md) | Product vision, features, requirements, constraints, roadmap |

**Before implementing changes:** Read `docs/architecture.md` first.

## Tech Stack

**Frontend:** React 19, TypeScript 5.8, React Router 7, Vite 5, Tailwind CSS 4
**Data:** IndexedDB (Dexie.js 4), localStorage, optional glean-oak-server sync
**Desktop:** Tauri v2 + plugins (notification, schedule-task, google-auth)
**Mobile:** Tauri Android + WorkManager for background tasks
**Forms:** React Hook Form 7, Radix UI primitives
**i18n:** i18next (EN, VI)
**Testing:** Vitest, jsdom

## Architecture Highlights

- **Offline-first:** All data in IndexedDB; sync is async, optional
- **ServiceFactory DI:** Singleton services via setter/getter, initialized in root
- **Embeddable:** Runs standalone or in glean-oak-app via Shadow DOM with SSO
- **Multi-platform:** Same React codebase for web, desktop, Android
- **Atomic Design:** atoms → molecules → organisms → pages
- **Spaced Repetition:** 3 algorithms + Leitner boxes + multi-mode cycling
- **Themes:** 6 themes via CSS custom properties, no hardcoded colors

## Prerequisites

- Node.js 18+, pnpm 9.1.0
- Rust 1.70+ (for desktop/Android)
- Android SDK + NDK (for Android builds)

## Environment

```bash
cp .env.example .env
# Set VITE_GOOGLE_CLIENT_ID for Google Drive backup
```

## Monorepo Structure

```
cham-lang/
├── apps/
│   ├── web/           # Standalone web app (Vite, port 5173)
│   └── native/        # Tauri desktop + Android
│       └── src-tauri/ # Rust backend (minimal: notifications only)
├── packages/
│   ├── ui/            # React components, adapters, services, hooks (~20K LOC)
│   ├── shared/        # Types, constants, utils
│   ├── tsconfig/      # Shared TypeScript configs
│   └── eslint-config/ # Shared ESLint config
└── docs/              # Architecture, standards, overview
```

See [`docs/codebase-summary.md`](docs/codebase-summary.md) for detailed structure and LOC breakdown.

## Database (IndexedDB v4)

12 synced tables: `vocabularies`, `collections`, `wordProgress`, `practiceProgress`, `learningSettings`, `topics`, `tags`, `userLearningLanguages`, `collectionSharedUsers`, + sync metadata (`_syncMeta`, `_pendingChanges`).

Local-only: `practiceSessions` (activity logs, not synced).

All synced tables use camelCase with required sync columns: `syncVersion`, `syncedAt`, `createdAt`, `updatedAt`, `deleted`, `deletedAt`.

## Key Invariants

Never violate (detailed in [`docs/architecture.md` § 12](docs/architecture.md#18-key-invariants--anti-patterns)):

1. All data ops via ServiceFactory getters, never import adapters directly
2. All writes set `syncVersion = Date.now()` + `syncedAt = null`
3. Client generates UUIDs; server doesn't assign IDs
4. `practiceSessions` local-only; never add to sync table list
5. `collectionSharedUsers` viewer-only; server enforces permissions
6. Never bypass SessionManager in practice pages
7. Soft-delete only: `deleted=1` + `deletedAt=Date.now()`
8. Web Lock `"cham-lang-sync"` wraps every sync cycle
9. Embedded mode theme changes via `CustomEvent("cham-lang-theme-change")` on `window`
10. No hardcoded hex colors; use `var(--color-*)` CSS properties

## Anti-Patterns

- ❌ Direct adapter import in components → ✅ Use `getVocabularyService()`
- ❌ Hard-delete records → ✅ Soft-delete: set `deleted=1`
- ❌ Missing `syncVersion`/`syncedAt` on writes → ✅ Always set both
- ❌ Bypass SessionManager in practice → ✅ Use SessionManager for mode cycling
- ❌ Hardcoded colors/gradients → ✅ Use theme CSS variables

## Development Workflow

1. **Design first:** Update `docs/architecture.md` with intended design (state machines, dataflow)
2. **Review design:** Check for invariant violations or coupling issues
3. **Implement:** Write code following [`docs/code-standards.md`](docs/code-standards.md)
4. **Post-impl review:** Patch `docs/architecture.md` if actual code diverged from design

See `docs/architecture.md` for detailed **gate 1 (design)** and **gate 2 (post-impl review)** workflow.

## Troubleshooting

- **IDB quota exceeded:** Large backups require Google Drive export
- **Sync failures:** Check network + glean-oak-server availability; see `_syncMeta` checkpoint
- **Theme changes not applying:** Ensure `--color-*` variables are set; check `global.css`
- **Android build fails:** Verify Android SDK + NDK installed; check `ANDROID_HOME` environment variable

## Related Docs

- Root `CLAUDE.md` — Developer guide, commands, conventions
- `ANDROID_SIGNING.md` — APK signing setup
- `GOOGLE_OAUTH_SETUP.md` — Google Drive OAuth configuration
- `RELEASE.md` — Release process and version bumping
