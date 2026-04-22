# Cham Lang — Codebase Summary

**Generated:** March 13, 2026 | **Project:** Offline-first vocabulary learning app | **Total:** 131K tokens, ~250 files, 28K LOC

## Directory Structure & LOC Estimates

```
cham-lang/ — root monorepo
├── apps/ (6K LOC)
│   ├── native/ — Tauri v2 desktop + Android entry point (3K LOC)
│   │   ├── src/ — React entry (App.tsx → ChamLangApp)
│   │   ├── src-tauri/ — Rust backend (3K LOC, minimal: notifications only)
│   │   │   ├── src/lib.rs — Plugin init, tray, window handlers (192 LOC)
│   │   │   ├── src/notification_commands.rs — Scheduled notifications
│   │   │   ├── src/scheduled_task_handler.rs — Background task handler
│   │   │   └── Cargo.toml — Tauri v2, tauri-plugin-schedule-task, Android support
│   │   └── tauri.conf.json — App config, icons, capabilities
│   └── web/ — Standalone web version (Vite + React 19, port 5173)
│       ├── src/App.tsx, main.tsx
│       └── vite.config.ts — dev server setup
│
├── packages/ (22K LOC)
│   ├── ui/ (~20K LOC) — All React components, adapters, services
│   │   └── src/
│   │       ├── components/ (~12K LOC, Atomic Design)
│   │       │   ├── atoms/ (14 files, 2.5K LOC) — Button, Input, Select, Card, Badge, Dialog, FlashCard, AudioPlayer, LoadingSpinner, etc.
│   │       │   ├── molecules/ (12 files, 3K LOC) — SearchBar, VocabularyCard, CollectionCard, TopBar, HeroCard, StatsCard, FillWordCard, MultipleChoiceCard
│   │       │   ├── organisms/ (12 files, 4K LOC) — VocabularyList, CollectionList, VocabularyForm, CollectionForm, AuthForm, Sidebar, BottomNav, SyncSettings, ShareCollectionDialog
│   │       │   ├── pages/ (22 files, 2K LOC) — HomePage, AddVocabulary, EditVocabulary, VocabularyDetail, CollectionsPage, CreateCollection, EditCollection, CollectionDetail, FillWordPractice, FlashcardPractice, MultipleChoicePractice, StudyMode, PracticeMode, Progress, LearningSettings, Settings, CSVExport, CSVImport, LoginPage, OAuthCallback, ThemePreview
│   │       │   └── templates/ (2 files) — AppShell, MainLayout
│   │       │
│   │       ├── adapters/ (4K LOC) — ServiceFactory pattern: setter/getter DI
│   │       │   ├── factory/ — ServiceFactory.ts + 9 service interfaces
│   │       │   │   └── interfaces/ — IAuthService, IVocabularyService, ICollectionService, IPracticeService, IWordProgressService, ILearningSettingsService, INotificationService, ICSVService, IGDriveService, ISyncService
│   │       │   ├── web/ — IndexedDB adapters via Dexie.js (all data)
│   │       │   │   ├── database.ts — Schema v4 with 12 tables + migrations
│   │       │   │   ├── IndexedDBVocabularyAdapter.ts
│   │       │   │   ├── IndexedDBCollectionAdapter.ts
│   │       │   │   ├── IndexedDBPracticeAdapter.ts
│   │       │   │   ├── IndexedDBWordProgressAdapter.ts
│   │       │   │   ├── IndexedDBLearningSettingsAdapter.ts
│   │       │   │   ├── IndexedDBSyncAdapter.ts — Checkpoint-based sync, Web Locks
│   │       │   │   ├── IndexedDBCSVAdapter.ts
│   │       │   │   ├── BrowserNotificationAdapter.ts
│   │       │   │   ├── WebGDriveAdapter.ts — Google Drive OAuth via GIS popup
│   │       │   │   ├── dexieBackupUtils.ts — Export/import entire DB
│   │       │   │   └── __tests__/ — Unit tests for sync, soft-delete, collection sharing
│   │       │   ├── tauri/ — Platform-specific adapters
│   │       │   │   ├── TauriNotificationAdapter.ts — Native notifications
│   │       │   │   └── TauriGDriveAdapter.ts — Google OAuth via plugin
│   │       │   └── shared/ — QmServerAuthAdapter (HTTP auth + token refresh)
│   │       │
│   │       ├── services/ (2K LOC) — Business logic facades (not adapters)
│   │       │   ├── AuthService.ts
│   │       │   ├── VocabularyService.ts
│   │       │   ├── CollectionService.ts
│   │       │   ├── PracticeService.ts
│   │       │   ├── WordProgressService.ts
│   │       │   ├── LearningSettingsService.ts
│   │       │   ├── NotificationService.ts
│   │       │   ├── GdriveService.ts
│   │       │   ├── CsvService.ts
│   │       │   ├── SyncService.ts
│   │       │   ├── FontSizeService.ts
│   │       │   └── WordSelectionService.ts
│   │       │
│   │       ├── utils/ (1.5K LOC) — Helpers
│   │       │   ├── sessionManager.ts (300 LOC) — SM-2/Leitner orchestration
│   │       │   ├── spacedRepetition/ — Algorithm implementations
│   │       │   │   ├── sm2.ts
│   │       │   │   ├── modifiedSm2.ts
│   │       │   │   ├── simple.ts
│   │       │   │   ├── leitnerBoxes.ts
│   │       │   │   └── algorithmFactory.ts
│   │       │   ├── platform.ts — isTauri() detection
│   │       │   └── loggers.ts
│   │       │
│   │       ├── hooks/ (6 files) — React custom hooks
│   │       │   ├── useAuth.ts
│   │       │   ├── useVocabularies.ts
│   │       │   ├── useCollections.ts
│   │       │   ├── useNav.ts
│   │       │   ├── useServerConnection.ts
│   │       │   ├── useCollectionPermission.ts
│   │       │   ├── useAsync.ts
│   │       │   └── useTestSession.ts
│   │       │
│   │       ├── contexts/ (4 files) — React context providers
│   │       │   ├── PlatformContext.tsx — All services
│   │       │   ├── ThemeContext.tsx — 6 themes + system detection
│   │       │   ├── DialogContext.tsx — alert()/confirm() modals
│   │       │   └── SyncNotificationContext.tsx — Sync status UI
│   │       │
│   │       ├── embed/ — Embeddable component
│   │       │   ├── ChamLangApp.tsx — Root component (accepts props: embedded, useRouter, basePath, authTokens, onLogoutRequest)
│   │       │   └── index.ts — Export for glean-oak-app
│   │       │
│   │       ├── i18n/ (2 translation files)
│   │       │   ├── config.ts — i18next setup
│   │       │   └── locales/
│   │       │       ├── en/translation.json
│   │       │       └── vi/translation.json
│   │       │
│   │       └── styles/
│   │           └── global.css (1070 LOC) — Tailwind v4, 6 theme definitions, CSS variables, claymorphism utilities
│   │
│   ├── shared/ (~1K LOC) — Types, constants, no React deps
│   │   ├── types/ — Auth, Collection, Vocabulary, Practice, Settings, Sync, CSV
│   │   ├── constants/ — Auth routes, app config
│   │   └── utils/ — env helpers, classname utilities, logger
│   │
│   ├── tsconfig/ — Shared TS configs (base, react-library, vite)
│   └── eslint-config/ — Shared ESLint rules
│
├── docs/
│   └── architecture.md — State machines, dataflow, invariants (9.8K tokens)
│
└── Root config files
    ├── cham-lang-app-schema.json — Server sync schema (9 tables, appId registration)
    ├── pnpm-workspace.yaml — Monorepo workspace definition
    ├── turbo.json — Turborepo pipeline config
    ├── package.json — Root dependencies
    ├── README.md — Project overview (feature list, tech stack)
    ├── CLAUDE.md — Developer guide (commands, architecture patterns, conventions)
    ├── .env.example — Google OAuth client ID/secret
    └── Other docs — ANDROID_SIGNING.md, GOOGLE_OAUTH_SETUP.md, RELEASE.md
```

## Key Files Reference

| File | Purpose | LOC |
|------|---------|-----|
| `docs/architecture.md` | State machines, dataflow, invariants | 1200 |
| `packages/ui/src/embed/ChamLangApp.tsx` | Root embed component | 150 |
| `packages/ui/src/adapters/factory/ServiceFactory.ts` | DI container | 100 |
| `packages/ui/src/adapters/web/database.ts` | Dexie schema v4 | 200 |
| `packages/ui/src/adapters/web/IndexedDBSyncAdapter.ts` | Checkpoint sync + Web Locks | 350 |
| `packages/ui/src/utils/sessionManager.ts` | Practice session orchestration | 300 |
| `packages/ui/src/utils/spacedRepetition/` | SM-2, Leitner algorithms | 200 |
| `packages/ui/src/contexts/ThemeContext.tsx` | 6 themes + system detection | 150 |
| `packages/ui/src/styles/global.css` | Tailwind v4, theme definitions | 1070 |
| `apps/native/src-tauri/src/lib.rs` | Tauri init, notifications | 192 |
| `cham-lang-app-schema.json` | Server schema registration | 80 |

## Dependency Graph

### Top-level

```
ChamLangApp (root)
  ├── PlatformContext (services)
  ├── ThemeContext (6 themes)
  ├── DialogContext (modals)
  ├── BrowserRouter (or parent's router if embedded)
  └── AppShell (routes)
```

### Components → Services Flow

| Layer | Components | Services | Adapters |
|-------|------------|----------|----------|
| Pages | HomePage, VocabularyList, Practice, Settings | useVocabularies(), useCollections(), useAsync() | ServiceFactory getters |
| Organisms | VocabularyList, CollectionForm | Business logic services (VocabularyService, CollectionService) | IndexedDB adapters |
| Services | All above | 12 service facades (AuthService, VocabularyService, etc.) | Web/Tauri/Shared adapters |
| Adapters | None | Service interfaces (IVocabularyService, etc.) | Dexie.js, Tauri plugins, HTTP |
| Data | None | None | IndexedDB (12 tables), localStorage (tokens, theme, language) |

### Database Tables (IndexedDB v4)

**Synced tables** (12 total):
- `vocabularies` — Words + metadata (definitions, examples, topics, tags, relatedWords, audioUrl, IPA, level)
- `collections` — Language-specific collections with sharing
- `wordProgress` — Per-word SR state (Leitner box, easiness factor, nextReviewDate, repetitions)
- `practiceProgress` — Per-language stats (streaks, totalWordsLearned, totalPracticeTime)
- `learningSettings` — Algorithm config, daily limits, reminder time
- `topics` — Topic tags
- `tags` — Custom tags
- `userLearningLanguages` — User's learning languages
- `collectionSharedUsers` — Collection sharing permissions (viewer-only)

**Sync infrastructure**:
- `_syncMeta` — Checkpoint tracking (key-value store)
- `_pendingChanges` — Queued deletes

**Local-only** (not synced):
- `practiceSessions` — Completed practice sessions (results) — local record-keeping

Sync columns (all synced tables): `syncVersion`, `syncedAt`, `createdAt`, `updatedAt`, `deleted`, `deletedAt`

## Monorepo Commands Summary

| Command | Effect |
|---------|--------|
| `pnpm dev:tauri` | Tauri desktop app (hot reload) |
| `pnpm dev:web` | Web dev server (port 5173) |
| `pnpm build` | Build all packages |
| `pnpm test` | Vitest watch mode |
| `pnpm lint` | ESLint all packages |
| `pnpm tauri android dev` | Android device/emulator |
| `pnpm tauri android build --apk true` | Build APK |
| `cargo build` (from apps/native/src-tauri/) | Build Rust backend |

## Tech Stack

| Domain | Technologies |
|--------|--------------|
| **Frontend** | React 19, TypeScript 5.8, React Router 7, Vite 5 |
| **Styling** | Tailwind CSS 4 (@tailwindcss/vite), CSS custom properties (6 themes) |
| **Data** | IndexedDB (Dexie.js 4), localStorage (tokens, preferences) |
| **Sync** | @glean-oak/sync-client-types, IndexedDBSyncAdapter, Web Locks API |
| **Desktop** | Tauri v2, tauri-plugin-schedule-task, tauri-plugin-notification |
| **Mobile** | Tauri Android, WorkManager (background tasks) |
| **Forms** | React Hook Form 7, Radix UI primitives |
| **Icons** | Lucide React |
| **Animations** | Framer Motion 12 |
| **i18n** | i18next + react-i18next (EN, VI) |
| **Testing** | Vitest, jsdom |
| **Rust** | tokio (async), serde (JSON), tauri (IPC) |

## File Statistics

```
Total Files:       250
Total Tokens:      131,214
Total Chars:       470,966

Top 5 by Tokens:
1. docs/architecture.md        9,805 tokens (7.5%)
2. en/translation.json         5,792 tokens (4.4%)
3. vi/translation.json         7,757 tokens (5.9%)
4. SVG assets (2 files)        9,120 tokens (7.0%)
5. global.css                  ~1,500 tokens (1.1%)

Code:              ~80K tokens
Translations (i18n): ~13K tokens
Docs:               ~10K tokens
Assets:             ~9K tokens
Config:             ~19K tokens
```

## Architecture Highlights

- **Offline-first**: All data in IndexedDB; sync is optional background operation
- **Multi-platform**: Same codebase runs web, desktop (Tauri), Android
- **ServiceFactory DI**: Singleton services initialized in root component, accessed via getters
- **Spaced Repetition**: SM-2, Modified SM-2, Simple algorithms + Leitner boxes (3/5/7)
- **Practice Modes**: Flashcard, Fill Word, Multiple Choice + Study Mode (untracked)
- **Themes**: 6 selectable themes (light, dark, chameleon, simple, cyber, system) via CSS class + variables
- **Sync**: Checkpoint-based, server-wins conflict resolution, soft delete with TTL
- **Embeddable**: ChamLangApp accepts props for embedding in glean-oak-app via Shadow DOM
- **i18n**: English + Vietnamese UI translations

## Next Steps for Documentation

1. **system-architecture.md** — High-level architecture overview, referencing detailed diagrams in docs/architecture.md
2. **code-standards.md** — Component patterns, naming conventions, anti-patterns, testing
3. **project-overview-pdr.md** — Product vision, features, requirements, non-functional constraints
4. **README.md update** — Keep concise, link to docs/
