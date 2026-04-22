# System Architecture

**See [`architecture.md`](./architecture.md)** for detailed state machines, sequence diagrams, dataflow, schema contracts, invariants, and anti-patterns. This doc provides the high-level overview.

## High-Level Architecture

Cham Lang is an **offline-first vocabulary learning app** with optional sync to glean-oak server. All platforms (web, desktop via Tauri, Android) use a unified **React 19 + TypeScript + IndexedDB** codebase.

### Platform Support Matrix

| Platform | Entry Point | Data Store | Notifications | Drive OAuth |
|----------|-------------|-----------|---|---|
| **Web** | `apps/web` | IndexedDB (Dexie.js) | Browser Notification API | Google Identity Services popup |
| **Desktop** | `apps/native` (Tauri v2) | IndexedDB (Dexie.js) | tauri-plugin-notification | tauri-plugin-google-auth |
| **Android** | `apps/native` (Tauri Android) | IndexedDB (Dexie.js) | tauri-plugin-notification + WorkManager | tauri-plugin-google-auth |

**Key principle**: All platforms share the same data layer (IndexedDB) and business logic. Platform-specific adapters only handle native capabilities (notifications, OAuth, system tray).

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Embed Layer (Optional)                   │
│  ChamLangApp renders standalone OR inside glean-oak-app       │
│  via Shadow DOM with shared localStorage tokens             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    Root Component Layer                      │
│  ChamLangApp (packages/ui/src/embed/ChamLangApp.tsx)        │
│  Initializes services, sets up contexts, mounts AppShell    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│               Context Provider Stack                         │
│  ThemeContext (6 themes)                                    │
│  PlatformContext (all services)                             │
│  DialogContext (alert/confirm)                              │
│  SyncNotificationContext (sync status)                       │
│  BrowserRouter (parent's if embedded, else standalone)      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    Components Layer                          │
│  Pages (22) → Organisms (12) → Molecules (12) → Atoms (14)  │
│  Atomic Design in packages/ui/src/components/               │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                     Hooks & Services                         │
│  useVocabularies() → VocabularyService                       │
│  useCollections() → CollectionService                        │
│  useAsync() → generic async orchestration                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                   Service Interfaces                         │
│  IVocabularyService, ICollectionService, IPracticeService   │
│  IAuthService, ISyncService, INotificationService, etc.     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│              ServiceFactory (DI Container)                   │
│  Singleton getter/setter pattern                            │
│  Initialized in ChamLangApp.tsx                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                 Adapter Implementations                      │
│  packages/ui/src/adapters/{web,tauri,shared}/               │
│  Web: IndexedDB adapters (Dexie.js)                         │
│  Tauri: Native notification, OAuth adapters                 │
│  Shared: QmServerAuthAdapter (HTTP auth + token refresh)    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                 Data Layer                                   │
│  IndexedDB (Dexie.js v4, schema v4, 12 tables)              │
│  localStorage (tokens, theme, language preference)          │
│  Optional: glean-oak server sync                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow: Component → Service → Adapter → IndexedDB

Example: **Add a vocabulary**

```
AddVocabularyPage (component)
  ↓ calls
useVocabularies() hook (state + API)
  ↓ calls
VocabularyService.add(input)
  ↓ delegates to
getVocabularyService() (ServiceFactory getter)
  ↓ returns
IndexedDBVocabularyAdapter.add(input)
  ↓ generates UUID, sets sync columns, calls
Dexie.js: db.vocabularies.add(record)
  ↓ writes to
IndexedDB (local storage)
  ↓ on next sync cycle
IndexedDBSyncAdapter.sync() (background)
  ↓ pushes unsynced records via
POST /api/v1/sync/{appId}/vocabularies/push
  ↓ to
glean-oak-server
```

## Sync Architecture

**Offline-first checkpoint-based sync** with Web Locks multi-tab safety:

1. **Local**: All writes to IndexedDB set `syncVersion = Date.now()` and `syncedAt = null`
2. **Trigger**: Auto-interval (5 min) or manual + app focus
3. **Lock**: Acquire `navigator.locks.request("cham-lang-sync")` (exclusive, multi-tab safe)
4. **Auth**: Validate JWT, refresh if expired
5. **Push**: POST unsynced records per table to `/sync/{appId}/{table}/push`
6. **Pull**: GET remote changes from `/sync/{appId}/{table}/pull?after_checkpoint={cp}`
7. **Commit**: Update `_syncMeta` with new checkpoint, merge server records (server-wins)
8. **Release**: Release Web Lock

**Conflict resolution**: Server-wins. If client and server both modified a record, server version overwrites local.

**Soft delete**: Records marked `deleted=1` + `deletedAt=Date.now()` are kept locally and pushed to server. Server applies TTL (60 days) and removes them.

**Not synced**:
- `practiceSessions` — local-only activity logs
- `_syncMeta`, `_pendingChanges` — sync metadata

See [`architecture.md` § 7: Sync State Machine](./architecture.md#7-sync-state-machine) for detailed state diagram.

## State Management Approach

**React Context only** — no Zustand, Redux, or other state libraries:

- **PlatformContext**: Provides all services (from ServiceFactory) to entire component tree
- **ThemeContext**: Current theme + resolved theme (for "system" resolution)
- **DialogContext**: `alert()` / `confirm()` API
- **SyncNotificationContext**: Sync status (in-progress, errors, last-sync time)

Each hook (`useVocabularies`, `useCollections`, `useAuth`) manages its own local component state via `useState`:

```tsx
const useVocabularies = (filter?: Filter) => {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(false);

  const addVocabulary = async (input: VocabularyInput) => {
    setLoading(true);
    const service = getVocabularyService();
    const vocab = await service.add(input);
    setVocabularies(prev => [...prev, vocab]);
  };

  return { vocabularies, loading, addVocabulary, ... };
};
```

**Why no global state manager?** Cham Lang's data lives in IndexedDB and syncs with the server. Local state in components is sufficient; no need for a separate state tree.

## Embeddable Component Pattern

ChamLangApp can run **standalone** or **embedded in glean-oak-app** via Shadow DOM:

```tsx
// Standalone (web app)
<BrowserRouter>
  <ChamLangApp useRouter={true} />
</BrowserRouter>

// Embedded in glean-oak-app
<ShadowWrapper>
  <ChamLangApp
    embedded={true}
    useRouter={false}
    basePath="/cham-lang"
    authTokens={{ accessToken, refreshToken, userId }}
    onLogoutRequest={() => parent.logout()}
  />
</ShadowWrapper>
```

**Key behaviors**:
- **Shadow DOM isolation**: CSS from global.css is scoped to the shadow root; element selectors (body, h1) don't leak to parent
- **SSO**: `authTokens` props stored in localStorage, shared with parent glean-oak-app
- **Navigation**: `useNav` hook prepends `basePath` to all routes
- **Router sharing**: When `useRouter=false`, parent's BrowserRouter is used
- **Theme dispatch**: In embedded mode, `"cham-lang-theme-change"` custom event sent to `window` for parent to handle

See [`architecture.md` § 14: Embeddable Component Pattern](./architecture.md#14-embeddable-component-pattern) for detailed lifecycle.

## Theme System

6 themes selectable at runtime via ThemeContext, stored in `localStorage['cham-lang-theme']`:

| Theme | CSS Class | Design | Fonts | Purpose |
|-------|-----------|--------|-------|---------|
| light | _(none)_ | Pastel claymorphism | Fredoka + Nunito | Default |
| dark | `.dark` | Deep indigo | Fredoka + Nunito | Night mode |
| chameleon | `.chameleon` | Nature green glassmorphism | Fredoka + Nunito | Eco-friendly |
| simple | `.simple` | Strict B&W | Fredoka + Nunito | Minimal |
| cyber | `.cyber` | Terminal aesthetic | JetBrains Mono | Dev-focused |
| system | _(resolves)_ | Auto light/dark | _(inherits)_ | Follows OS preference |

All colors use CSS custom properties (`--color-*`), no hardcoded hex. See `packages/ui/src/styles/global.css` for variable definitions.

## Spaced Repetition & Practice Modes

### Algorithms

Three configurable SM-2 variants:

| Algorithm | Interval Calc | Easiness Factor | Best For |
|-----------|---------------|-----------------|----------|
| **SM-2** | Classic: I(n) = I(n-1) × EF | Dynamic per rating | Optimal spacing |
| **Modified SM-2** | Fixed per Leitner box | Fixed (not adjusted) | Predictable schedules |
| **Simple Doubling** | Doubles on correct, resets on fail | Not used | Quick learning |

### Leitner Boxes

Configurable 3, 5, or 7 boxes with fixed review intervals:

| Boxes | Intervals |
|-------|-----------|
| 3 | 1d, 7d, 30d |
| 5 | 1d, 3d, 7d, 14d, 30d |
| 7 | 1d, 2d, 4d, 7d, 14d, 30d, 60d |

### Practice Modes

| Mode | Prompt | Input | Multi-mode Cycle |
|------|--------|-------|------------------|
| **Flashcard** | Definition → recall word | Reveal answer | Bit 0 |
| **Fill Word** | Missing word in sentence | Type word | Bit 1 |
| **Multiple Choice** | Definition → pick option | Select option | Bit 2 |

Word advances Leitner box only after **all 3 modes answered correctly in one cycle**. Failed answer resets cycle and demotes word to box 1.

**Study Mode**: Practice without tracking progress (untracked vocabulary review).

See [`architecture.md` § 6: Practice Session State Machine](./architecture.md#6-practice-session-state-machine) for detailed state diagram + SM-2 recalc formula.

## Routing & Navigation

All routes defined in `AppShell.tsx` with lazy-loaded page components:

| Route | Component | Auth | Purpose |
|-------|-----------|------|---------|
| `/` | HomePage | JWT | Collections + search |
| `/login` | LoginPage | None | Credential form |
| `/vocabulary/add` | AddVocabularyPage | JWT | Create word |
| `/vocabulary/edit/:id` | EditVocabularyPage | JWT | Edit word |
| `/vocabulary/:id` | VocabularyDetailPage | JWT | Word details + usage |
| `/collections` | CollectionsPage | JWT | List all collections |
| `/collections/new` | CreateCollectionPage | JWT | Create collection |
| `/collections/:id/edit` | EditCollectionPage | JWT | Edit collection |
| `/collections/:id` | CollectionDetailPage | JWT | View collection words |
| `/practice` | PracticeModePage | JWT | Mode selector |
| `/practice/{mode}` | FlashcardPracticePage, etc. | JWT | Practice session |
| `/practice/study/{mode}` | StudyModePage | JWT | Untracked practice |
| `/progress` | ProgressPage | JWT | Stats + streaks |
| `/settings` | SettingsPage | JWT | App preferences |
| `/settings/learning` | LearningSettingsPage | JWT | SR algorithm config |
| `/settings/theme-preview` | ThemePreviewPage | JWT | Preview all themes |
| `/csv/export` | CSVExportPage | JWT | Export words to CSV |
| `/csv/import` | CSVImportPage | JWT | Import words from CSV |
| `/oauth/callback` | OAuthCallbackPage | None | Google Drive OAuth handler |
| `*` | — | — | Redirect to `/` |

In **embedded mode**, `useNav` hook prepends `basePath` to all navigation calls.

## Component Design: Atomic Design

**Hierarchy**: atoms → molecules → organisms → pages → templates

- **Atoms (14)**: Button, Input, Select, TextArea, Card, Badge, Dialog, Modal, FlashCard, AudioPlayer, LoadingSpinner, Accordion, StatusBadge, ErrorBoundary
- **Molecules (12)**: SearchBar, VocabularyCard, CollectionCard, TopBar, HeroCard, FillWordCard, MultipleChoiceCard, StatsCard, SharedUserItem, BulkActionToolbar, SearchFiltersCard, QuickActionsCard
- **Organisms (12)**: VocabularyList, CollectionList, VocabularyForm, CollectionForm, AuthForm, Sidebar, BottomNavigation, SyncSettings, ShareCollectionDialog, CollectionSelectorDialog, ServerDisconnectedOverlay, BrowserSyncInitializer
- **Templates (2)**: AppShell (routing + layout), MainLayout (sidebar + outlet)
- **Pages (22)**: HomePage, VocabularyPages, CollectionPages, PracticePages, SettingsPages, etc.

See [`architecture.md` § 16: Component Hierarchy](./architecture.md#16-component-hierarchy) for detailed component relationships.

## Authentication & Authorization

**Dual authentication**:
- **App identity**: `X-API-Key` + `X-App-Id` headers (identifies cham-lang to glean-oak-server)
- **User identity**: `Authorization: Bearer {jwt}` (authenticates user)

**Token management**:
- Tokens stored in `localStorage` with keys `cham_lang_access_token`, `cham_lang_refresh_token`, `cham_lang_user_id`
- QmServerAuthAdapter intercepts auth failures and auto-refreshes tokens
- On token expiry, user redirected to `/login`
- On logout, all tokens cleared and IndexedDB for current user deleted

**Embedded mode SSO**: Parent glean-oak-app provides `authTokens` prop; ChamLangApp uses these and subscribes to logout cleanup callbacks.

See [`architecture.md` § 5: Auth State Machine](./architecture.md#5-auth-state-machine) for detailed auth flow.

## Rust Backend (Minimal)

Located in `apps/native/src-tauri/src/`:

- **lib.rs** (192 LOC): Tauri plugin init, tray icon (desktop), window management
- **notification_commands.rs**: Tauri commands for scheduling notifications
- **scheduled_task_handler.rs**: Background task handler (fired by OS scheduler)

Desktop-only (Android excluded via `cfg(not(target_os = "android"))`):
- Single instance plugin
- System tray icon (hide to tray on minimize)

**All data ops use IndexedDB** — Rust backend does NOT access the database. This allows all platforms to share the same codebase.

## Database Schema (IndexedDB v4)

12 tables with required sync columns (`syncVersion`, `syncedAt`, `createdAt`, `updatedAt`, `deleted`, `deletedAt`):

**Data tables**:
- `vocabularies` — Words + metadata
- `collections` — Collections
- `wordProgress` — SR tracking per word
- `practiceProgress` — Aggregate stats per language
- `learningSettings` — SR algorithm config
- `topics`, `tags`, `userLearningLanguages` — Categorization
- `collectionSharedUsers` — Sharing permissions

**Sync tables**:
- `_syncMeta` — Checkpoint tracking
- `_pendingChanges` — Queued deletes

**Local-only**:
- `practiceSessions` — Activity logs (not synced)

See [`architecture.md` § 2: Data Models & Schema Contracts](./architecture.md#2-data-models--schema-contracts) for detailed schema diagram.

## Key Invariants

Never violate these design principles (see [`architecture.md` § 12](./architecture.md#18-key-invariants--anti-patterns)):

| # | Invariant |
|---|-----------|
| 1 | All data ops through ServiceFactory getters, never import adapters directly |
| 2 | All writes set `syncVersion=Date.now()` + `syncedAt=null` |
| 3 | Client generates UUIDs; server doesn't assign IDs |
| 4 | `practiceSessions` is local-only — never add to sync table list |
| 5 | `collectionSharedUsers` is viewer-only; server enforces permissions |
| 6 | Never bypass SessionManager in practice pages |
| 7 | Soft-delete only — set `deleted=1` + `deletedAt=Date.now()` |
| 8 | Web Lock `"cham-lang-sync"` wraps every sync cycle |
| 9 | Theme changes in embedded mode via `CustomEvent("cham-lang-theme-change")` on `window` |
| 10 | No hardcoded hex colors — use `var(--color-*)` CSS properties |

## External Dependencies

**Key packages**:
- React 19, React Router 7, TypeScript 5.8
- Tauri v2, Dexie.js v4
- Tailwind CSS 4 (@tailwindcss/vite)
- Radix UI (Select, Dialog, Checkbox), Lucide React icons
- React Hook Form 7, Framer Motion 12
- i18next + react-i18next (EN, VI)
- @glean-oak/sync-client-types (TypeScript types from glean-oak-server)

See `package.json` and root CLAUDE.md for complete dependency list.

## Related Documents

- [`architecture.md`](./architecture.md) — Detailed state machines, dataflow, sequences, invariants
- [`code-standards.md`](./code-standards.md) — Component patterns, naming, anti-patterns, testing
- [`project-overview-pdr.md`](./project-overview-pdr.md) — Product vision, features, requirements
- `README.md` — Quick start, development commands
- Root `CLAUDE.md` — Developer guide, workflow, conventions
