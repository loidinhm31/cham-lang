# Cham Lang

An offline-first vocabulary learning app with spaced repetition. Runs as a standalone web app, Tauri desktop app, and Android app. Embeddable in [qm-hub-app](../../qm-hub-app) via Shadow DOM.

**Current version:** 0.4.1

## Features

### Vocabulary Management

- Words with definitions, IPA pronunciation, audio URL, example sentences, topics, tags, related words
- Optional **concept field** for alternative learning prompts
- Language-specific proficiency levels (CEFR A1–C2 for European languages; Basic/Intermediate/Advanced for Asian languages)
- CSV import/export (with or without headers)
- Soft delete on all records

### Collections

- Organize vocabularies into language-specific collections
- Collection sharing: invite other users as editors via `collectionSharedUsers`
- Word count tracked automatically

### Practice Modes

| Mode            | Description                              |
| --------------- | ---------------------------------------- |
| Flashcard       | See definition/concept → recall word     |
| Fill Word       | Fill missing word in an example sentence |
| Multiple Choice | Choose correct definition from options   |

All modes support:

- **Concept Mode** — toggle between Definition and Concept prompts
- **Study Mode** — practice without tracking progress
- **Bidirectional** fill word (definition→word or word→definition)
- Configurable auto-advance timeout (default 2 s)

### Spaced Repetition

Three algorithm options:

- **SM-2** — dynamic easiness factor
- **Modified SM-2** — fixed intervals per Leitner box
- **Simple Doubling** — interval doubles on each success

Configurable Leitner box count (3, 5, or 7). Words must complete all three practice modes in a cycle to advance boxes.

### Sync with qm-hub Server

- Checkpoint-based offline-first sync via `IndexedDBSyncAdapter`
- Dual auth: `X-API-Key` + `X-App-Id` (app identity) and `Authorization: Bearer` (user JWT)
- Per-table `lastSyncTimestamp` stored in `_syncMeta`
- Client-generated UUIDs — records created fully offline
- Soft delete with TTL propagated to server

### Google Drive Backup

- Backup and restore entire database to/from Google Drive
- Version tracking prevents data loss on restore
- Works completely offline if preferred

### Daily Reminders

- Set a daily reminder time from Learning Settings
- Persists through app closure and device reboots (WorkManager on Android, async delay on desktop)
- Auto-reschedules for the next day after firing
- Android 13+ runtime permission handling

### Multi-Theme UI

Five themes selectable at runtime: **Light (Chameleon)**, **Dark**, **Simple**, **Cyber**, **Green**. All components use CSS custom properties (`--color-bg-app`, `--color-primary-500`, etc.) — no hardcoded colors or gradients.

---

## Tech Stack

### Frontend

| Library                  | Version | Purpose                                                     |
| ------------------------ | ------- | ----------------------------------------------------------- |
| React                    | 19      | UI                                                          |
| TypeScript               | 5.8     | Type safety                                                 |
| Tailwind CSS             | 4       | Styling (via `@tailwindcss/vite`, no PostCSS)               |
| React Router DOM         | 7       | Navigation                                                  |
| Dexie.js                 | 4       | IndexedDB (all platforms)                                   |
| react-i18next / i18next  | latest  | i18n (EN, VI)                                               |
| Framer Motion            | 12      | Animations                                                  |
| React Hook Form          | 7       | Forms                                                       |
| Radix UI                 | latest  | Accessible primitives (Select, Dialog, Accordion, Checkbox) |
| Lucide React             | latest  | Icons                                                       |
| class-variance-authority | latest  | Component variants                                          |

### Backend (Tauri — minimal)

The Rust backend only provides native platform features. All data lives in IndexedDB.

| Crate/Plugin                   | Purpose                                  |
| ------------------------------ | ---------------------------------------- |
| tauri 2                        | App framework                            |
| tauri-plugin-notification 2    | Native notifications                     |
| tauri-plugin-schedule-task     | Background task scheduling (custom fork) |
| tauri-plugin-google-auth 0.3   | Google OAuth for Drive backup            |
| tauri-plugin-dialog 2          | File dialogs                             |
| tauri-plugin-store 2           | Key-value store                          |
| tauri-plugin-opener 2          | Open files/URLs                          |
| tauri-plugin-single-instance 2 | Single instance guard (desktop only)     |

---

## Monorepo Structure

```
cham-lang/
├── apps/
│   ├── web/              # Standalone web app (Vite + React 19, port 5173)
│   └── native/           # Tauri v2 desktop + Android
│       └── src-tauri/
│           └── src/
│               ├── lib.rs                    # App init, plugin registration, tray
│               ├── main.rs                   # Entry point
│               ├── notification_commands.rs  # Tauri commands for scheduling
│               └── scheduled_task_handler.rs # Background task handler
├── packages/
│   ├── ui/               # All React components, adapters, services, hooks
│   │   └── src/
│   │       ├── components/
│   │       │   ├── atoms/        # Button, Input, Select, Card, Modal, AudioPlayer
│   │       │   ├── molecules/    # SearchBar, VocabularyCard, TopBar, BottomNavigation
│   │       │   ├── organisms/    # VocabularyList, CollectionList, PracticeModeSelector, Sidebar
│   │       │   ├── templates/    # AppShell, MainLayout
│   │       │   └── pages/        # Full page components (see list below)
│   │       ├── adapters/
│   │       │   ├── web/          # IndexedDB adapters (Dexie.js) for all data ops
│   │       │   ├── tauri/        # TauriNotificationAdapter, TauriGDriveAdapter
│   │       │   ├── shared/       # QmServerAuthAdapter (HTTP sync auth)
│   │       │   └── factory/      # ServiceFactory + interfaces
│   │       ├── services/         # Business logic, SessionManager
│   │       ├── hooks/            # React hooks
│   │       ├── contexts/         # PlatformContext
│   │       ├── i18n/             # EN + VI translations
│   │       ├── styles/           # global.css (Tailwind v4, CSS vars, themes)
│   │       └── embed/            # ChamLangApp embed entry point
│   ├── shared/           # Types, constants, utilities (no React deps)
│   ├── tsconfig/         # Shared TS configs
│   └── eslint-config/    # Shared ESLint config
└── README.md
```

### Pages

`AddVocabulary`, `CollectionDetail`, `Collections`, `CreateCollection`, `CSVExport`, `CSVImport`, `EditCollection`, `EditVocabulary`, `FillWordPractice`, `FlashcardPractice`, `HomePage`, `LearningSettings`, `Login`, `MultipleChoicePractice`, `OAuthCallback`, `PracticeMode`, `Progress`, `Settings`, `StudyMode`, `ThemePreview`, `VocabularyDetail`

---

## Database (IndexedDB via Dexie.js v4)

Schema version 4 — defined in `packages/ui/src/adapters/web/database.ts`.

**Core tables** (camelCase fields, matching server JSON):

| Table                   | Description                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| `vocabularies`          | Words with embedded definitions, examples, topics, tags, relatedWords     |
| `collections`           | Language-specific word collections with sharing info                      |
| `practiceSessions`      | Completed sessions with embedded results                                  |
| `wordProgress`          | Per-word spaced repetition state (Leitner box, easiness factor, interval) |
| `practiceProgress`      | Per-language statistics (streaks, totals)                                 |
| `learningSettings`      | SR algorithm config, daily limits, reminder time                          |
| `topics`, `tags`        | Organization                                                              |
| `userLearningLanguages` | Languages the user is studying                                            |
| `collectionSharedUsers` | Sharing permissions between users                                         |

**Sync tables:**

| Table             | Description                                 |
| ----------------- | ------------------------------------------- |
| `_syncMeta`       | Checkpoint timestamps per table (key-value) |
| `_pendingChanges` | Queued deletes for sync propagation         |

Required sync columns on every synced table: `syncVersion`, `syncedAt`, `createdAt`, `updatedAt`, `deleted`, `deletedAt`.

---

## Architecture

### ServiceFactory Pattern

Services are initialized in `ChamLangApp.tsx` using setters, not auto-detected globally:

```typescript
// Data — all platforms use IndexedDB
setVocabularyService(new IndexedDBVocabularyAdapter());
setCollectionService(new IndexedDBCollectionAdapter());

// Platform-specific
if (isTauri()) {
  setNotificationService(new TauriNotificationAdapter());
  setGDriveService(new TauriGDriveAdapter());
} else {
  setNotificationService(new BrowserNotificationAdapter());
  setGDriveService(new WebGDriveAdapter());
}
```

Access services via getters (`getVocabularyService()`) — throws if not initialized.

### Embeddable Component

`ChamLangApp` in `packages/ui/src/embed/ChamLangApp.tsx` runs standalone or embedded in `qm-hub-app`:

```tsx
<ChamLangApp
  useRouter={false} // share parent's BrowserRouter
  embedded={true} // hide outer navigation
  basePath="/cham-lang"
  authTokens={{ accessToken, refreshToken, userId }}
  onLogoutRequest={() => {}}
/>
```

---

## Development Commands

```bash
# Install dependencies (from cham-lang root)
pnpm install

# Dev
pnpm dev:web          # Web dev server — port 5173
pnpm dev:tauri        # Tauri desktop app

# Build
pnpm build            # All packages
pnpm build:web        # Web only
pnpm build:tauri      # Tauri only

# Test
pnpm test             # Vitest watch mode
pnpm test:run         # Single run
pnpm test:coverage    # Coverage report

# Lint & format
pnpm lint
pnpm format

# Android
pnpm tauri android dev                  # Run on device/emulator
pnpm tauri android build --apk true     # Build APK

# Type check
pnpm tsc --noEmit

# Rust (from apps/native/src-tauri/)
cargo check
cargo build
```

---

## Setup

### Prerequisites

- Node.js 18+, pnpm 9.1.0
- Rust 1.70+
- For Android: Android SDK + NDK (minSdk 26)

### Environment

```bash
# packages/ui or apps/web — Google OAuth for Drive backup
cp .env.example .env
# Set VITE_GOOGLE_CLIENT_ID
```

---

## Android Support

- Minimum SDK 26 (required by `tauri-plugin-schedule-task`)
- WorkManager for background notification scheduling
- Native `NotificationHelper.kt` for Android 13+ notifications
- Google Drive OAuth via native plugin

```bash
pnpm tauri android dev                  # Development
pnpm tauri android build --apk true     # Production APK

# Logs
adb logcat | grep -i cham
```

---

## i18n

Interface languages: **English**, **Vietnamese**. Translations in `packages/ui/src/i18n/locales/`.

Learning languages: English, Vietnamese, Spanish, French, German, Korean, Japanese, Chinese.

---

## Anti-Patterns to Avoid

- Don't call `invoke()` directly for data — all data ops use IndexedDB adapters
- Don't bypass `usePlatform()` / `ServiceFactory` getters in components
- Don't bypass `SessionManager` in practice pages
- Don't hardcode language levels — use backend configuration
- Don't use `dark:` Tailwind variants — use CSS custom properties (`--color-*`)
- Don't use hardcoded colors or gradients — use theme-aware CSS variables
