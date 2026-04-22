# Cham Lang — Project Overview & Product Development Requirements

**Version:** 0.4.1 | **Last Updated:** March 2026 | **Status:** Active Development

## 1. Product Vision

Cham Lang is an **offline-first vocabulary learning application** that enables users to build and maintain multilingual vocabularies with intelligent spaced repetition. The app prioritizes accessibility, user privacy through offline-first design, and seamless cross-platform synchronization.

### Target Users

1. **Language learners** — Students building vocabulary in English, Vietnamese, Spanish, French, German, Korean, Japanese, Chinese
2. **Polyglots** — Professionals maintaining multiple languages simultaneously
3. **glean-oak embedded users** — Integrated into personal knowledge management dashboard
4. **Mobile learners** — Commuters and travelers using Android or web on-the-go
5. **Desktop users** — Power users managing large vocabulary collections locally

### Core Objectives

- Enable vocabulary building **with zero connectivity requirements** (offline-first)
- Provide **intelligent review scheduling** via spaced repetition algorithms
- Support **multi-platform learning** (web, desktop Tauri, Android)
- Integrate seamlessly into **glean-oak-app personal dashboard**
- Ensure **data privacy** via local-first architecture + optional server sync
- Minimize cognitive load with **intuitive UI** and **multiple theme options**

---

## 2. Feature Matrix

### Core Features (Implemented)

#### Vocabulary Management

| Feature | Status | Details |
|---------|--------|---------|
| Add/edit/delete vocabulary | ✅ Done | With IPA, definitions, examples, audio URL, proficiency levels |
| Bulk import (CSV) | ✅ Done | Import words with metadata from CSV file |
| Bulk export (CSV) | ✅ Done | Export vocabularies to CSV for backup or external use |
| Search & filter | ✅ Done | Search by word, definition, tags; filter by collection, level |
| Tags & topics | ✅ Done | Organize words with custom tags and predefined topics |
| Related words | ✅ Done | Link synonyms, antonyms, word families |
| Audio pronunciation | ✅ Done | Store and play audio URL for each word |
| Concept mode | ✅ Done | Alternative learning prompts alongside definitions |

#### Collections

| Feature | Status | Details |
|---------|--------|---------|
| Create/manage collections | ✅ Done | Language-specific groupings with metadata |
| Collection sharing | ✅ Done | Invite other users as viewers (read-only) |
| Word count tracking | ✅ Done | Auto-calculated per collection |
| Soft delete | ✅ Done | Deleted records kept locally and server-side for 60 days |

#### Practice Modes

| Feature | Status | Details |
|---------|--------|---------|
| Flashcard mode | ✅ Done | Definition/concept → recall word, with flip animation |
| Fill word mode | ✅ Done | Complete missing word in sentence (bidirectional) |
| Multiple choice mode | ✅ Done | Select correct definition from options |
| Study mode | ✅ Done | Practice without tracking progress |
| Auto-advance | ✅ Done | Configurable timeout (default 2s) |
| Concept toggle | ✅ Done | Switch between definition and concept prompts per session |

#### Spaced Repetition & Scheduling

| Feature | Status | Details |
|---------|--------|---------|
| SM-2 algorithm | ✅ Done | Classic with dynamic easiness factor |
| Modified SM-2 | ✅ Done | Fixed intervals per Leitner box |
| Simple doubling | ✅ Done | Doubles on correct, resets on fail |
| Leitner boxes | ✅ Done | 3, 5, or 7 configurable boxes with fixed intervals |
| Multi-mode cycling | ✅ Done | Words must complete all 3 modes in cycle before advancing |
| Interval recalculation | ✅ Done | Per-word recalc on each practice session |
| Failure tracking | ✅ Done | Max 5 failures per word per session |

#### Statistics & Progress

| Feature | Status | Details |
|---------|--------|---------|
| Practice streak | ✅ Done | Consecutive days with ≥1 practice session |
| Words learned | ✅ Done | Count of words completed in all boxes |
| Practice time | ✅ Done | Aggregate time spent in all practice sessions |
| Progress page | ✅ Done | View per-language stats and history |
| Session history | ✅ Done | Completed sessions with results (local-only) |

#### Sync & Backup

| Feature | Status | Details |
|---------|--------|---------|
| glean-oak server sync | ✅ Done | Checkpoint-based, offline-first, server-wins conflict resolution |
| Web Locks multi-tab safety | ✅ Done | Prevent concurrent sync conflicts across tabs/windows |
| Google Drive backup | ✅ Done | Export/restore entire database to Drive |
| Auto-sync on schedule | ✅ Done | 5-minute interval + app-focus triggers |
| Manual sync button | ✅ Done | Force sync in settings |
| Sync status indicator | ✅ Done | Show sync in-progress, errors, last sync time |

#### User Interface & Theming

| Feature | Status | Details |
|---------|--------|---------|
| Light theme | ✅ Done | Default pastel claymorphism design |
| Dark theme | ✅ Done | Deep indigo night mode |
| Chameleon theme | ✅ Done | Nature green glassmorphism |
| Simple theme | ✅ Done | Strict black & white |
| Cyber theme | ✅ Done | Terminal aesthetic with monospace fonts |
| System theme | ✅ Done | Auto light/dark per OS preference |
| Responsive design | ✅ Done | Mobile, tablet, desktop layouts |
| Atomic design components | ✅ Done | Reusable atoms, molecules, organisms |
| i18n (English, Vietnamese) | ✅ Done | Full UI localization |
| Daily reminder notifications | ✅ Done | Desktop + Android with WorkManager |

#### Authentication & Embedding

| Feature | Status | Details |
|---------|--------|---------|
| Email/password login | ✅ Done | via glean-oak-server |
| Token refresh | ✅ Done | Auto-refresh on expiry |
| Embedded mode | ✅ Done | Shadow DOM isolation in glean-oak-app |
| SSO integration | ✅ Done | Share localStorage tokens with parent |
| Logout cleanup | ✅ Done | Clear tokens and delete current user's IndexedDB |

### Planned Features (Not Yet Implemented)

| Feature | Priority | Notes |
|---------|----------|-------|
| Spaced repetition stats dashboard | Medium | Visualize progress curves, retention rates, weak areas |
| Audio recording (user voice) | Low | Record pronunciation attempts for feedback |
| Pronunciation feedback | Low | Compare user recording to reference audio |
| Community collections | Low | Share user-created collections publicly |
| Offline mode indicator | Low | Show when sync is disabled/offline |
| Batch operations | Medium | Bulk edit, bulk tag, bulk export metadata |
| Vocabulary recommendations | Low | Suggest related words or next words to learn |
| Gamification (badges, levels) | Low | Progress milestones and achievement system |
| Handwritten input (mobile) | Low | Draw characters for Asian languages |
| Example sentences generation (AI) | Low | Generate contextual sentences per word |

---

## 3. Platform Support Matrix

| Platform | Status | Min Requirements | Features |
|----------|--------|-------------------|----------|
| **Web** | ✅ Active | Modern browser (Chrome, Safari, Firefox, Edge) | All features except native notifications |
| **Desktop (Tauri)** | ✅ Active | macOS 10.15+, Windows 10+, Linux (Ubuntu 18.04+) | All features + system tray, native notifications |
| **Android** | ✅ Active | Android 7.0+ (API 26) | All features + WorkManager background tasks, native notifications |
| **iOS** | ❌ Not planned | — | No plans due to Tauri limitations |

---

## 4. Technical Architecture (Summary)

### Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript 5.8, React Router 7, Vite 5 |
| **Styling** | Tailwind CSS 4 (@tailwindcss/vite), 6 themes via CSS custom properties |
| **Data** | IndexedDB (Dexie.js 4), localStorage (tokens, preferences) |
| **Sync** | Checkpoint-based HTTP sync, Web Locks API, soft-delete |
| **Desktop** | Tauri v2, tauri-plugin-notification, tauri-plugin-schedule-task |
| **Mobile** | Tauri Android, WorkManager |
| **Forms** | React Hook Form 7, Radix UI primitives |
| **Testing** | Vitest, jsdom |
| **Build** | Turborepo monorepo with pnpm 9.1.0 |

### Architecture Pattern

- **Offline-first**: All data in IndexedDB; sync is async non-blocking
- **ServiceFactory DI**: Singleton services via setter/getter pattern
- **Atomic Design**: Components organized as atoms → molecules → organisms → pages
- **Embeddable**: ChamLangApp wraps entire app, accepts props for embedding

See [`system-architecture.md`](./system-architecture.md) and [`architecture.md`](./architecture.md) for detailed diagrams and state machines.

---

## 5. Non-Functional Requirements

### Performance

| Metric | Target | Current Status |
|--------|--------|---|
| Initial load (web) | <2s | ✅ Achieved (Vite SPA) |
| Practice mode launch | <300ms | ✅ Achieved (IndexedDB native speed) |
| Sync cycle | <5s per table | ✅ Achieved (checkpoint pagination) |
| App responsiveness | 60 FPS animations | ✅ Framer Motion + GPU-accelerated CSS |
| Database size | <50MB (10K words) | ✅ IndexedDB handles up to 50MB+ |

### Security & Privacy

| Requirement | Implementation |
|-------------|---|
| **Offline-first data** | All data in IndexedDB; sync optional |
| **No tracking** | No analytics, pixel tracking, or telemetry |
| **Token security** | JWT stored in localStorage with auto-refresh |
| **HTTPS enforcement** | Web forces HTTPS; desktop/mobile via Tauri |
| **Input validation** | React Hook Form + server-side validation |
| **CORS protection** | Server enforces strict CORS headers |
| **XSS prevention** | React escapes JSX by default; no innerHTML |

### Accessibility

| Feature | Status |
|---------|--------|
| Semantic HTML | ✅ ARIA roles on Radix UI components |
| Keyboard navigation | ✅ Full keyboard support via Radix |
| Screen reader support | ✅ ARIA labels on form inputs |
| High contrast modes | ✅ Simple + Dark themes |
| Reduced motion option | ⚠️ Partial (Framer Motion respects prefers-reduced-motion) |
| Color-blind friendly | ✅ No red/green pairs alone for meaning |

### Reliability & Data Integrity

| Requirement | Implementation |
|-------------|---|
| **Soft delete** | Deleted records marked with TTL, not removed |
| **Conflict resolution** | Server-wins strategy for sync conflicts |
| **Transaction safety** | Dexie.js bulk operations are atomic |
| **Multi-tab sync** | Web Locks API prevents concurrent sync races |
| **Data backup** | Google Drive export/import + server checkpoint |
| **Schema migrations** | Dexie.js versioning with upgrade functions |

### Scalability

| Constraint | Solution |
|-----------|----------|
| **Large vocabulary count** | IndexedDB supports 10K+ words; pagination in UI |
| **Long sync history** | Checkpoint-based pagination (100 records/batch) |
| **Multiple languages** | Per-language statistics and filtering |
| **Collection sharing** | Read-only viewer model; server enforces permissions |

---

## 6. User Requirements

### User Stories

#### 1. Language Learner Building Spanish Vocabulary

**As a** Spanish learner,
**I want to** add words from my textbook with definitions and example sentences,
**So that** I can review them using spaced repetition.

**Acceptance criteria:**
- Can add word with definition, examples, tags
- Can search and filter by tag or level
- Can practice via flashcard, fill-word, multiple-choice
- Practice sessions track progress and notify of review schedule

#### 2. Polyglot Maintaining Multiple Languages

**As a** polyglot studying French, German, and Japanese simultaneously,
**I want to** organize vocabularies into separate collections per language,
**So that** I can practice efficiently without mixing languages.

**Acceptance criteria:**
- Can create language-specific collections
- Can see per-language statistics
- Can switch between languages in practice mode
- Sync preserves all languages across devices

#### 3. Traveler Practicing Offline

**As a** traveler with intermittent internet,
**I want to** practice vocabulary offline without losing progress,
**So that** my learning doesn't stop during flights or remote areas.

**Acceptance criteria:**
- App works fully offline without sync
- All practice data saved locally
- When online, sync automatically pushes/pulls
- No data loss on app restart

#### 4. glean-oak-app User Embedding Cham Lang

**As a** glean-oak user with multiple embeddable apps,
**I want to** access Cham Lang without leaving the hub dashboard,
**So that** I can manage my vocabulary learning centrally.

**Acceptance criteria:**
- Cham Lang loads within Shadow DOM in glean-oak
- Auth tokens shared via parent (no re-login)
- Theme changes in glean-oak apply to Cham Lang
- Logout in Cham Lang notifies parent for cleanup

#### 5. Teacher Distributing Vocabulary to Students

**As a** teacher,
**I want to** create a vocabulary collection and share it with my class as viewers,
**So that** students can all practice from the same material.

**Acceptance criteria:**
- Can create collection with metadata
- Can invite multiple users as viewers
- Viewers can practice but cannot edit
- Shared collection syncs to viewers' devices

---

## 7. Success Metrics

### User Engagement

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily active users (DAU) | — | Google Analytics (optional future) |
| Average session duration | >15 min | App instrumentation |
| Words practiced per session | >10 | PracticeSession records |
| Retention rate (30-day) | >40% | Count active users week 4 vs week 1 |

### Feature Adoption

| Feature | Target | Measurement |
|---------|--------|-------------|
| Collections usage | >80% of users | Count users with ≥1 collection |
| Spaced repetition active | >70% of users | Count users who completed ≥1 SR session |
| Sync enable rate | >50% | Count users with sync enabled |
| Theme diversity | >3 themes used | Survey or theme-change events |

### Data & Integrity

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sync success rate | >99.5% | Log push/pull failures |
| Data loss incidents | 0 | User reports + manual audits |
| Offline-to-online merge conflicts | <0.1% | Log server-wins during sync |
| App crash rate | <0.5% | Error tracking (Sentry or custom) |

---

## 8. Constraints & Dependencies

### Technical Constraints

1. **IndexedDB quota**: Limited to ~50MB per origin; large backup via Google Drive
2. **Tauri Android limitations**: Requires API 26+, custom Kotlin for Android 13+ notifications
3. **Shadow DOM**: CSS must be scoped; bare element selectors wrapped in `@layer base`
4. **CORS**: All sync requests must be CORS-enabled on glean-oak-server
5. **localStorage quota**: ~5MB per origin; tokens + theme/lang prefs are <10KB

### Dependencies

| Dependency | Version | Status |
|----------|---------|--------|
| glean-oak-server (sync endpoint) | — | Required for multi-device sync |
| @glean-oak/sync-client-types | Latest | TypeScript types for sync |
| tauri-plugin-schedule-task | Custom fork | Android background task scheduling |
| Google Cloud APIs | — | Google Drive OAuth + optional future Gemini API |

### External Services

| Service | Purpose | Optional |
|---------|---------|----------|
| glean-oak-server | Data sync + authentication | No — required for sync |
| Google Drive | Backup/restore | Yes — optional backup |
| Google Identity Services | OAuth popup (web) | Yes — Drive backup only |

---

## 9. Project Roadmap

### Phase 1 (Complete ✅)
- Core vocabulary CRUD
- Collections management
- Three practice modes
- Spaced repetition (SM-2 + Leitner)
- IndexedDB persistence
- Multi-theme UI

### Phase 2 (Active 🔄)
- glean-oak-server sync integration
- Google Drive backup
- Android support (Tauri)
- Daily reminders
- Embedded mode in glean-oak-app

### Phase 3 (Planned 📋)
- Advanced statistics dashboard
- Batch operations
- Community collections (optional)
- Offline indicator
- AI-generated example sentences (optional)

### Phase 4+ (Future)
- Pronunciation feedback (optional)
- Gamification (optional)
- Handwritten input for Asian languages (optional)
- Mobile app store distribution

---

## 10. Known Limitations

1. **iOS not supported** — Tauri v2 lacks native iOS support; would require native Swift
2. **Large databases** — >100K words may degrade IndexedDB performance; use pagination or archiving
3. **Sharing read-only** — Collection sharing is viewer-only; no collaborative editing
4. **Sync conflicts** — Server-wins strategy may lose recent local changes; manual conflict UI not implemented
5. **No offline notifications** — Background reminders only work on platforms with native support (not web)
6. **Audio playback** — Requires HTTP URLs; no in-app recording yet
7. **Single user per IndexedDB** — Each user gets isolated DB per device; no multi-user on single device

---

## 11. Success Criteria for Completion

A release is considered **feature-complete** when:

- [ ] All core practice modes work offline
- [ ] Sync to glean-oak-server is reliable (>99% success rate)
- [ ] All 6 themes render correctly
- [ ] Android + web + desktop all pass functional tests
- [ ] Embedded mode works in glean-oak-app (Shadow DOM, SSO, theme dispatch)
- [ ] Documentation is comprehensive (code standards, architecture, API)
- [ ] No critical bugs in user-reported issues
- [ ] Performance metrics met (initial load <2s, practice mode <300ms)

---

## 12. Document References

- **Architecture Details**: [`architecture.md`](./architecture.md) — State machines, dataflow, invariants
- **System Design**: [`system-architecture.md`](./system-architecture.md) — Layers, patterns, embeddability
- **Code Standards**: [`code-standards.md`](./code-standards.md) — Naming, components, anti-patterns
- **Codebase Summary**: [`codebase-summary.md`](./codebase-summary.md) — File inventory, dependencies, LOC
- **Root CLAUDE.md**: Developer guide with commands and conventions
- **Root README.md**: Quick start and feature overview
