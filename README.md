# Cham Lang - Language Learning App

A modern, offline-first vocabulary learning application built with Tauri 2, React, TypeScript, and SQLite. Features spaced repetition learning, multiple practice modes, audio playback, daily reminders, and optional Google Drive sync. Supports both desktop and Android platforms.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Development Commands](#development-commands)
- [Mobile/Android Support](#mobileandroid-support)
- [Recent Updates](#recent-updates)
- [Troubleshooting](#troubleshooting)

## Features

### Vocabulary Management

- **Comprehensive Word Information**
    - Word definitions with translations
    - IPA pronunciation guide
    - Audio pronunciation (supports MP3, WAV, OGG, M4A, AAC formats)
    - Example sentences
    - Word types (noun, verb, adjective, etc.)
    - Language-specific proficiency levels (CEFR for European languages, Basic/Intermediate/Advanced for Asian languages)
    - Topic categorization
    - Related words (synonyms, antonyms, derivatives)
    - Optional concept field for alternative learning prompts
- **Audio Playback**: Integrated audio player with support for online audio URLs
- **Pagination**: Efficient lazy loading for large vocabulary lists

### Collection-Based Organization

- **Collections**: Organize vocabularies into language-specific collections
- **Word Count Tracking**: Automatic word count per collection
- **Import/Export**: CSV and plain text CSV support
- **Soft Deletion**: Collections and words use soft delete for data recovery

### Practice Modes

Three comprehensive practice modes with spaced repetition:

1. **Flashcard Practice**: See definition/concept, recall the word
2. **Fill Word Practice**: Fill in missing word from example sentence
   - **Bidirectional Support**: Practice definition→word or word→definition
   - **Hint System**: Toggle-able hints for extra support
3. **Multiple Choice Practice**: Choose correct definition from options

**Special Features**:
- **Concept Mode**: Toggle between Definition Mode and Concept Mode for alternative learning prompts
- **Study Mode vs Practice Mode**: Choose to practice with or without progress tracking
- **Multi-Mode Completion**: Words must complete all three modes in a review cycle to advance boxes
- **Auto-Advance**: Configurable auto-advance timeout (default: 2 seconds)

### Spaced Repetition Learning

- **Three Algorithm Options**:
    - SM-2 (SuperMemo 2) with dynamic easiness factor
    - Modified SM-2 with fixed intervals per Leitner box
    - Simple Doubling (interval doubles on each success)

- **Leitner Box System**: Configurable 3, 5, or 7 boxes with progressive review intervals
- **Smart Word Selection**: Prioritizes due words, limits new words per session
- **Progress Tracking**:
  - Per-word statistics including streak, interval, easiness factor
  - Per-language progress segregation
  - Box distribution visualization
  - Session statistics with duration and accuracy
- **Advanced Settings**:
  - New words per day limit (default: 20)
  - Daily review limit (default: 100)
  - Consecutive correct threshold per box
  - Auto-advance timeout (default: 2 seconds)
  - Hint display preferences

### Google Drive Backup

- **Optional Cloud Sync**: Backup entire database to Google Drive
- **Conflict Detection**: Version tracking prevents data loss
- **Easy Restore**: One-click restore from cloud backup
- **Privacy**: Works completely offline if you prefer

### Beautiful UI/UX

- **Chameleon Theme**: Colorful, adaptive design with glassmorphism effects
- **Smooth Animations**: Floating background elements and transitions
- **Mobile-First Design**: Responsive layout optimized for all screen sizes
- **Bottom Navigation**: Easy thumb-accessible navigation

### Multi-language Support

- **Interface Languages**: English and Vietnamese (extensible i18n system)
- **Learning Languages**: Supports English, Vietnamese, Spanish, French, German, Korean, Japanese, Chinese
- **Language-Specific Levels**:
    - CEFR (A1-C2) for European languages
    - Basic/Intermediate/Advanced for Asian languages

### Daily Reminders & Notifications

**Daily Reminder** (New in v0.0.15):
- **Schedule Study Reminders**: Set a daily reminder at a specific time to practice vocabulary
- **Persistent Reminders**: Notifications persist through app closure and device reboots
- **Auto-Rescheduling**: Automatically reschedules for the next day after the reminder fires
- **Cross-Platform**: Works on Desktop (Windows, macOS, Linux) and Android
- **Easy Configuration**: Enable/disable and set time from Learning Settings page

**Scheduled Notifications**:
- Schedule one-time or recurring notifications
- Works on both Desktop and Android
- Runtime permission handling on Android 13+
- Test notification features for debugging

**Implementation:**

1. **Frontend (ProfilePage.tsx)**
   ```typescript
   import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";

   // Check/request permission
   let permissionGranted = await isPermissionGranted();
   if (!permissionGranted) {
     const permission = await requestPermission();
     permissionGranted = permission === "granted";
   }

   // Schedule notification
   await invoke("schedule_test_notification_one_minute");
   ```

2. **Backend (notification_commands.rs)**
   ```rust
   use tauri_plugin_schedule_task::{ScheduleTaskRequest, ScheduleTime, ScheduleTaskExt};

   #[tauri::command]
   pub async fn schedule_notification(app: AppHandle, title: String, body: String, delay_seconds: u64) {
     let mut parameters = HashMap::new();
     parameters.insert("title".to_string(), title);
     parameters.insert("body".to_string(), body);

     let task_request = ScheduleTaskRequest {
       task_name: format!("notification_{}", chrono::Utc::now().timestamp()),
       schedule_time: ScheduleTime::Duration(delay_seconds),
       parameters: Some(parameters),
     };

     app.schedule_task().schedule_task(task_request).await?;
   }
   ```

3. **Task Handler (scheduled_task_handler.rs)**
   ```rust
   impl<R: Runtime> ScheduledTaskHandler<R> for NotificationTaskHandler {
     fn handle_scheduled_task(&self, task_name: &str, parameters: HashMap<String, String>, app: &AppHandle<R>) {
       // Desktop: Use Tauri's notification API
       // Android: Handled by MainActivity (see below)
     }
   }
   ```

4. **Android Native (NotificationHelper.kt)**
   - **Purpose**: Send notifications using Android's native NotificationManager
   - **Why needed**: Tauri's notification API requires active app context, unavailable in background workers
   - **Usage**: Called by MainActivity when scheduled task triggers

5. **Android Native (MainActivity.kt)**
   - Intercepts scheduled task launches via `onNewIntent()` / `onCreate()`
   - Extracts notification parameters from intent extras
   - Calls `NotificationHelper.sendNotification()` to display notification

6. **NotificationWorker.kt** (not currently used)
   - Alternative approach to send notifications directly from WorkManager
   - Can be used for more efficient notification delivery without launching MainActivity

**Required Dependencies:**

```toml
# Cargo.toml
tauri-plugin-notification = "2"
tauri-plugin-schedule-task = "0.1"
```

```json
// package.json
"@tauri-apps/plugin-notification": "^2.3.3"
```

**Android Configuration:**

```gradle
// build.gradle.kts
android {
  defaultConfig {
    minSdk = 26  // Required by schedule-task plugin
  }
}
dependencies {
  implementation("androidx.work:work-runtime-ktx:2.9.0")
}
```

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
```

**Plugin Initialization (lib.rs):**
```rust
// IMPORTANT: schedule-task must be initialized FIRST
tauri::Builder::default()
    .plugin(tauri_plugin_schedule_task::init_with_handler(NotificationTaskHandler))
    .plugin(tauri_plugin_notification::init())
    // ... other plugins
```

**How It Works:**

- **Desktop**: Plugin uses Tauri's async runtime to delay task execution (like setTimeout)
- **Android**: Plugin uses WorkManager to schedule background workers that run even when app is closed
  - When time arrives, WorkManager launches MainActivity with intent extras
  - MainActivity extracts notification parameters and displays notification using native Android API

### Architecture

- **Atomic Design Pattern**:
    - **Atoms**: Button, Input, TextArea, Select, Badge, Card, Modal, AudioPlayer
    - **Molecules**: SearchBar, VocabularyCard, TopBar, BottomNavigation, StatsCard
    - **Organisms**: VocabularyList, VocabularyForm, CollectionList, PracticeModeSelector
    - **Templates**: MainLayout
    - **Pages**: Home, Collections, AddVocabulary, VocabularyDetail, Practice modes (Flashcard, Fill Word, Multiple Choice), Settings, Learning Settings, Profile, Statistics

- **Offline-First**: All data stored locally in SQLite
- **Service Layer**: Clean separation between frontend and Tauri backend
- **Type Safety**: Full TypeScript coverage with shared types

### Database

- **SQLite Backend**: Lightweight, embedded database with bundled support
- **Cross-Platform**: Works on desktop and Android
- **Platform-Specific Storage**: Automatic app data directory selection
- **Schema Versioning**: Migration system for database updates
- **Comprehensive Schema**:
  - Core tables: users, collections, vocabularies, definitions, example sentences
  - Practice tables: practice_sessions, practice_results, word_progress, word_progress_completed_modes
  - Organization: topics, tags, related words (many-to-many relationships)
  - Settings: learning_settings with algorithm, box count, and notification preferences
  - Sync: database_metadata for Google Drive version tracking

## Tech Stack

### Frontend

- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **React Router DOM 7** - Navigation
- **React i18next** - Internationalization
- **Lucide React** - Icon library
- **Framer Motion** - Animations
- **React Hook Form** - Form management

### Backend

- **Tauri 2** - Desktop/mobile app framework
- **Rust** - Backend language
- **rusqlite7** - Embedded SQLite database with bundled support
- **Tauri Plugins**:
  - `tauri-plugin-google-auth 0.3` - Google OAuth authentication
  - `tauri-plugin-notification 2` - Native notifications
  - `tauri-plugin-schedule-task` - Background task scheduling
  - `tauri-plugin-dialog 2` - File dialogs
  - `tauri-plugin-opener 2` - Open files/URLs
- **serde + serde_json** - Serialization/deserialization
- **chrono** - Date/time handling
- **uuid** - ID generation
- **reqwest** - HTTP client for Google Drive API
- **csv** - CSV parsing for import/export

## Installation

### Prerequisites

- Node.js 18+ and pnpm
- Rust 1.70+
- For Android: Android SDK and NDK

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cham-lang
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run in development mode**
   ```bash
   # Desktop
   pnpm tauri dev

   # Android (requires Android SDK)
   pnpm tauri android dev
   ```

## Usage

### Getting Started

1. Launch the application
2. The app creates a local SQLite database automatically
3. Create your first collection from the Collections page
4. Start adding vocabulary words

### Creating Collections

1. Navigate to Collections page
2. Click "Add Collection"
3. Enter collection name and select language
4. Start adding words to your collection

### Adding Vocabulary

1. Select a collection
2. Click "Add Word" button
3. Fill in word details:
    - Word text
    - Word type
    - Proficiency level
    - IPA pronunciation
    - Definitions (with translations)
    - Optional concept (alternative learning prompt)
    - Example sentences
    - Topics
    - Related words
4. Click "Save"

### Practicing Vocabulary

1. Navigate to Practice page
2. Select a collection
3. Choose practice mode (Flashcard, Fill Word, or Multiple Choice)
4. Toggle between Concept Mode and Definition Mode (if concept exists)
5. Complete the session
6. Review your results and progress

### Configuring Spaced Repetition

1. Go to Settings page
2. Choose spaced repetition algorithm (SM-2, Modified SM-2, or Simple Doubling)
3. Configure Leitner box count (3, 5, or 7 boxes)
4. Set consecutive correct threshold
5. Adjust review intervals per box
6. Set daily new word limit (default: 20)
7. Set daily review limit (default: 100)
8. Configure auto-advance timeout
9. Toggle hint display in fill word mode

### Setting Up Daily Reminders

1. Go to Learning Settings page
2. Enable "Daily Reminder"
3. Set your preferred reminder time (e.g., 09:00 for 9 AM)
4. Save settings
5. Grant notification permissions when prompted (Android 13+)
6. Reminder will automatically reschedule for the next day after each notification

### Google Drive Backup

1. Go to Profile page
2. Click "Backup to Google Drive"
3. Authenticate with Google account
4. Database is uploaded to your Google Drive

To restore:
1. Click "Restore from Google Drive"
2. System checks for version conflicts
3. Confirm restore operation

### Import/Export

- **Export Collection**: Export vocabulary to CSV format
- **Import from CSV**: Import words from CSV file (with or without headers)
- **Plain Text Import**: Import simple word lists

## Project Structure

```
cham-lang/
├── src/
│   ├── components/
│   │   ├── atoms/          # Basic UI components
│   │   ├── molecules/      # Composite components
│   │   ├── organisms/      # Complex components
│   │   ├── templates/      # Page layouts
│   │   └── pages/          # Full pages
│   ├── i18n/
│   │   ├── config.ts       # i18n configuration
│   │   └── locales/        # Translation files
│   │       ├── en/
│   │       └── vi/
│   ├── types/              # TypeScript types
│   ├── services/           # Tauri command wrappers
│   └── utils/              # Utility functions
│       └── spacedRepetition/  # SR algorithms
├── src-tauri/
│   ├── gen/android/app/src/main/java/com/loidinh/cham_lang/
│   │   ├── MainActivity.kt           # Handles scheduled task intents
│   │   ├── NotificationHelper.kt     # Native Android notification sender
│   │   └── NotificationWorker.kt     # Alternative worker implementation
│   └── src/
│       ├── models.rs                 # Data models
│       ├── local_db.rs               # SQLite operations
│       ├── commands.rs               # Vocabulary commands
│       ├── collection_commands.rs    # Collection commands
│       ├── gdrive.rs                 # Google Drive sync
│       ├── notification_commands.rs  # Notification scheduling commands
│       ├── scheduled_task_handler.rs # Background task handler
│       └── lib.rs                    # Main entry point
└── README.md
```

## Configuration

### Tailwind CSS

The project uses Tailwind CSS 4 with custom chameleon theme colors:

- Primary: Teal/Cyan gradient
- Secondary: Amber/Orange gradient
- Accent colors: Emerald, Orange, Pink

### Internationalization

Add new interface languages by:

1. Creating a new locale folder in `src/i18n/locales/`
2. Adding translation JSON files
3. Importing in `src/i18n/config.ts`
4. Adding to language selector

Add new learning languages by:

1. Update `get_level_config()` in `src-tauri/src/models.rs`
2. Add language-specific level options
3. Update TypeScript types if needed

## Development Commands

### Type Checking

```bash
# Frontend
pnpm tsc --noEmit

# Backend
cargo check --manifest-path=src-tauri/Cargo.toml
```

### Building

```bash
# Production build
pnpm build

# Android APK
pnpm tauri android build --apk true
```

### Android Development

```bash
# Initialize Android (first time only)
pnpm tauri android init

# Run on Android
pnpm tauri android dev

# View Android logs
timeout 10 /home/loidinh/Android/Sdk/platform-tools/adb logcat
```

## Mobile/Android Support

The app fully supports Android with:

- SQLite database (platform-specific storage)
- Google Drive sync (OAuth authentication)
- Touch-optimized UI
- Bottom navigation for easy thumb access

### Building for Android

1. Ensure Android SDK is installed
2. Run `pnpm tauri android init` (first time only)
3. Connect device or start emulator
4. Run `pnpm tauri android dev` for development
5. Run `pnpm tauri android build --apk true` for production

## Troubleshooting

### Database Issues

- Database is created automatically in app data directory
- Check logs for SQLite errors
- Use Google Drive backup/restore for data recovery

### TypeScript Errors

```bash
pnpm tsc --noEmit
```

### Rust Compilation Errors

```bash
cargo check --manifest-path=src-tauri/Cargo.toml
```

### Android Debugging

```bash
# Monitor Android logs
adb logcat

# Filter for app logs
adb logcat | grep -i chameleon
```

### Anti-Patterns to Avoid

- Don't use `invoke()` directly in components - use service layer
- Don't modify database from frontend - use Tauri commands
- Don't create global state unnecessarily
- Don't bypass SessionManager in practice pages
- Don't hard-code language levels - use backend configuration