# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cham Lang is an offline-first vocabulary learning app supporting desktop (Tauri), Android, and web platforms. Features spaced repetition, multiple practice modes, Google Drive backup, and sync with qm-hub server.

**All platforms use IndexedDB for data storage** via Dexie.js, enabling true offline-first operation with a unified codebase. The Rust backend is minimal - only providing native notifications and system tray.

## Development Commands

```bash
# Development
pnpm dev:tauri        # Run Tauri desktop app
pnpm dev:web          # Run web version

# Building
pnpm build            # Build all packages
pnpm build:tauri      # Build Tauri app only
pnpm build:web        # Build web only

# Testing
pnpm test             # Run Vitest (watch mode)
pnpm test:run         # Run tests once
pnpm test -- sessionManager      # Run single test by name
pnpm test -- packages/ui/src/utils/sessionManager.test.ts  # Run single test file

# Linting & Formatting
pnpm lint             # Lint all packages
pnpm format           # Format with Prettier

# Rust (from apps/native/src-tauri/)
cargo check           # Check Rust code
cargo build           # Build Rust backend

# Android (requires Android SDK)
pnpm tauri android dev    # Run on Android device/emulator
pnpm tauri android build --apk true  # Build APK
adb logcat | grep -i cham  # View Android logs
```

## Monorepo Architecture

```
cham-lang/
├── apps/
│   ├── native/           # Tauri desktop + Android app
│   │   ├── src/          # App entry point
│   │   └── src-tauri/    # Rust backend (minimal - notifications only)
│   └── web/              # Web-only version
├── packages/
│   ├── ui/               # All React components, adapters, services
│   ├── shared/           # Types, constants, utilities
│   ├── eslint-config/
│   └── tsconfig/
```

### UI Package Structure (packages/ui/src/)

Follows **Atomic Design**:

- `components/atoms/` - Button, Input, Select, Modal, AudioPlayer
- `components/molecules/` - SearchBar, VocabularyCard, TopBar
- `components/organisms/` - VocabularyList, CollectionList, PracticeModeSelector
- `components/templates/` - MainLayout
- `components/pages/` - Full page components

**Platform Adapters** (`adapters/`):

- `web/` - IndexedDB adapters (Dexie.js) for all data operations (vocabulary, collection, practice, settings, CSV, sync)
- `tauri/` - Platform-specific: Native notifications (`TauriNotificationAdapter`), Google OAuth (`TauriGDriveAdapter`)
- `shared/` - Cross-platform: `QmServerAuthAdapter` for qm-hub authentication
- `factory/` - `ServiceFactory` with setter/getter pattern for dependency injection

### ServiceFactory Pattern

Services are initialized in `ChamLangApp.tsx` using setters, not auto-detected:

```typescript
// Data services - all platforms use IndexedDB
setVocabularyService(new IndexedDBVocabularyAdapter());
setCollectionService(new IndexedDBCollectionAdapter());
// ... etc

// Platform-specific services
if (isTauri()) {
  setNotificationService(new TauriNotificationAdapter());
  setGDriveService(new TauriGDriveAdapter());
} else {
  setNotificationService(new BrowserNotificationAdapter());
  setGDriveService(new WebGDriveAdapter());
}
```

Access services via getters (`getVocabularyService()`) which throw if not initialized.

### Rust Backend (apps/native/src-tauri/src/)

Minimal Rust backend - only provides native platform features:

- `notification_commands.rs` - Scheduled notifications via `tauri-plugin-schedule-task`
- `scheduled_task_handler.rs` - Handler for scheduled notification tasks
- `lib.rs` - Tauri app init, plugin registration, tray icon (desktop only)
- `main.rs` - Entry point

Desktop-only features (excluded from Android via `cfg(not(target_os = "android"))`):

- Single instance plugin
- System tray icon (hide to tray on close/minimize)

## Key Conventions

- **Path alias**: `@/*` maps to `./src/*` in TypeScript
- **Tailwind CSS 4**: Uses `@tailwindcss/vite` plugin (not PostCSS)
- **React 19** with React Router DOM 7
- **Tauri 2** for desktop/mobile
- **IndexedDB**: All platforms use Dexie.js for data storage
- **pnpm 9.1.0** as package manager

## Theme System & CSS Variables

### Overview

Theme source: `packages/ui/src/styles/global.css`
Theme context: `packages/ui/src/contexts/ThemeContext.tsx`

The app supports 6 theme options stored in localStorage under `cham-lang-theme`:

| Option        | Resolved CSS class                         | Notes                                                                   |
| ------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `"light"`     | _(no class — default pastel claymorphism)_ | Default                                                                 |
| `"dark"`      | `.dark`                                    | Deep indigo dark mode                                                   |
| `"chameleon"` | `.chameleon`                               | Nature/green glassmorphic                                               |
| `"simple"`    | `.simple`                                  | Strict black & white                                                    |
| `"cyber"`     | `.cyber`                                   | Developer terminal aesthetic                                            |
| `"system"`    | `.dark` or _(no class)_                    | Follows `prefers-color-scheme` — resolves to `"light"` or `"dark"` only |

Both a CSS class and `data-theme` attribute are set on the root element in standalone mode. In embedded mode, the `"cham-lang-theme-change"` custom event (`CHAM_LANG_THEME_EVENT`) is dispatched on `window` with `{ detail: { theme: resolved } }` for the `ShadowWrapper` in qm-hub-app to handle.

### Custom Tailwind Variants

```css
@custom-variant dark      (&:where(.dark, .dark *));
@custom-variant chameleon (&:where(.chameleon, .chameleon *));
@custom-variant simple    (&:where(.simple, .simple *));
@custom-variant cyber     (&:where(.cyber, .cyber *));
```

These allow `dark:`, `chameleon:`, `simple:`, `cyber:` Tailwind prefixes. **Prefer CSS variables over these variants** — variables work across all themes without explicit branching.

### Standard Cross-App Variables

| Variable                 | Light (default) | Chameleon                | Dark      | Simple    | Cyber     | Purpose                  |
| ------------------------ | --------------- | ------------------------ | --------- | --------- | --------- | ------------------------ |
| `--color-bg-app`         | `#cffafe`       | `#e5f3cc`                | `#1e1b4b` | `#ffffff` | `#0F172A` | Root page background     |
| `--color-bg-light`       | `#eef2ff`       | `#9ace57`                | `#0f172a` | `#ffffff` | `#0F172A` | Page / layout background |
| `--color-bg-white`       | `#ffffff`       | `rgba(255,255,255,0.25)` | `#1e293b` | `#ffffff` | `#1E293B` | Card / input background  |
| `--color-text-primary`   | `#1e1b4b`       | `#1e1b4b`                | `#f8fafc` | `#000000` | `#F1F5F9` | Main text                |
| `--color-text-secondary` | `#475569`       | `#333333`                | `#cbd5e1` | `#000000` | `#94A3B8` | Secondary text           |
| `--color-text-muted`     | `#64748b`       | _(inherits light)_       | `#94a3b8` | `#666666` | `#64748B` | Hints / captions         |
| `--color-border-light`   | `#c7d2fe`       | `rgba(255,255,255,0.4)`  | `#334155` | `#000000` | `#334155` | Default border           |
| `--color-primary-500`    | `#4f46e5`       | `#ca5f38`                | `#4f46e5` | `#737373` | `#3B82F6` | Primary action / accent  |

Usage pattern (Tailwind v4 arbitrary CSS variable syntax):

```tsx
// Backgrounds
<div className="bg-(--color-bg-white) border border-(--color-border-light) rounded-lg p-4">

// Text
<h2 className="text-(--color-text-primary)">Title</h2>
<p className="text-(--color-text-secondary)">Body</p>
<span className="text-(--color-text-muted)">Caption</span>

// Primary accent — use .btn-* for BG (plain bg-(--color-primary-500) breaks in Shadow DOM via Tailwind v4 gradient chain)
<button className="btn-primary text-white">Action</button>
<span className="text-(--color-primary-500)">Link</span>

// App root background (inline style only — not a Tailwind utility)
<div style={{ background: "var(--color-bg-app)" }}>
```

### Font Variables

| Variable                | Light / Chameleon / Dark / Simple | Cyber              |
| ----------------------- | --------------------------------- | ------------------ |
| `--font-family-heading` | `"Fredoka"`                       | `"JetBrains Mono"` |
| `--font-family-body`    | `"Nunito"`                        | `"JetBrains Mono"` |

The cyber theme sets both font variables to JetBrains Mono via a rule in `global.css` (outside `@layer base`) applied to `.cyber, .cyber *`.

### Claymorphism Utility Classes

cham-lang's primary visual style is claymorphism. These utility classes are defined in `global.css` and receive per-theme CSS overrides:

| Class                                     | Description                                         |
| ----------------------------------------- | --------------------------------------------------- |
| `.clay-card`                              | Chunky 3D card with bottom shadow                   |
| `.clay-btn`                               | Chunky playful button with press effect             |
| `.clay-badge`                             | Small chunky label                                  |
| `.clay-peach/blue/mint/lilac/yellow/pink` | Pastel clay background colors                       |
| `.glass-panel`                            | Glassmorphic surface (prominent in chameleon theme) |

### CSS Isolation Note

`global.css` has bare `body` and `h1`–`h6` selectors **outside** `@layer base`. These are safe for standalone mode but can bleed into `qm-hub-app`'s light DOM in embedded/dev HMR mode. The host app's unlayered `body { }` rule prevents visible bleedthrough, but any new bare element selectors added to `global.css` **must** go inside `@layer base`.

### Anti-Patterns

- **Do NOT use `dark:` prefix** for styles that should also apply in chameleon/simple/cyber — `dark:` only activates in `.dark`, not other themes.
- **Do NOT hardcode** hex values for theme-sensitive colors — use the CSS variable equivalents.
- **Do NOT use `bg-gradient-to-*` on buttons** — Tailwind v4 gradient chains break in Shadow DOM. Use `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger`, etc. instead.
- **Do NOT add bare element selectors** (`body`, `h1`–`h6`) outside `@layer base` — they can leak into `qm-hub-app`'s light DOM.

## Platform Abstraction

All platforms share the same data layer (IndexedDB), with platform-specific adapters only for:

- **Notifications**: `TauriNotificationAdapter` (native) vs `BrowserNotificationAdapter` (web)
- **Google Drive OAuth**: `TauriGDriveAdapter` (native plugin) vs `WebGDriveAdapter` (GIS popup)
- **Authentication**: All platforms use `QmServerAuthAdapter` with localStorage

Services in `packages/ui/src/services/` use adapters from `packages/ui/src/adapters/factory/` for platform-agnostic code.

## Environment Setup

```bash
# Root: Google OAuth for Google Drive backup
cp .env.example .env
# Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET
```

## Database

IndexedDB via Dexie.js (schema v4, see `packages/ui/src/adapters/web/database.ts`):

**Core tables:**

- `vocabularies` - Words with embedded definitions, examples, topics, tags, relatedWords (flattened, no JOINs)
- `collections` - Language-specific word collections with sharing info
- `practiceSessions` - Completed practice sessions with embedded results (**local-only by design** — not included in sync push/pull; no `deleted`/`deletedAt` fields)
- `wordProgress` - Per-word spaced repetition state (Leitner box, easiness factor, etc.)
- `practiceProgress` - Per-language practice statistics (streaks, totals)
- `learningSettings` - SR algorithm config, daily limits, reminders
- `topics`, `tags`, `userLearningLanguages`
- `collectionSharedUsers` - Tracks collection access (id, collectionId, userId, createdAt, syncVersion, syncedAt). Sharing is **viewer-only by design** — server enforces permissions regardless of any stored data

**Sync tables:**

- `_syncMeta` - Checkpoint tracking (key-value)
- `_pendingChanges` - Queued deletes for sync

Required sync columns (camelCase): `syncVersion`, `syncedAt`, `createdAt`, `updatedAt`

## Sync Architecture

- **Offline-first**: All data stored locally in IndexedDB
- **Checkpoint-based sync**: Uses `IndexedDBSyncAdapter` to sync with qm-hub server
- **Dual auth**: API keys identify apps (`X-API-Key` + `X-App-Id`), JWT tokens authenticate users (`Authorization: Bearer`)
- **Per-table sync**: Each table tracks its own `lastSyncTimestamp` in `syncMetadata`
- **Client-generated UUIDs**: Enables offline record creation
- **Soft delete**: Deleted records marked with `deleted: 1` + `deletedAt: number` (ms). Kept locally until server confirms TTL expiry. Pushed as `deleted: true` sync records on next sync. Multi-tab concurrent sync prevented via Web Locks API (`"cham-lang-sync"` lock)

## Embeddable Component Pattern

`ChamLangApp` in `packages/ui/src/embed/ChamLangApp.tsx` can run standalone or embedded in qm-hub-app:

```tsx
<ChamLangApp
  useRouter={false} // Use parent's BrowserRouter when embedded
  embedded={true} // Hide outer navigation (sidebar, bottom nav)
  basePath="/cham-lang" // Prefix for navigation links
  authTokens={{ accessToken, refreshToken, userId }} // SSO from parent
  onLogoutRequest={() => {}} // Notify parent on logout
/>
```

## Anti-Patterns to Avoid

- Don't bypass the service layer - use `usePlatform()` hook to access services
- Don't call `invoke()` directly for data operations - all data is in IndexedDB
- Don't bypass SessionManager in practice pages
- Don't hard-code language levels - use backend configuration
