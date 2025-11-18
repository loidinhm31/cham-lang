# 🦎 Chameleon - Language Learning App

A modern, beautiful vocabulary management application built with Tauri, React, TypeScript, and MongoDB. Designed with an atomic design pattern and mobile-first responsive UI.

## ✨ Features

### 📚 Vocabulary Management
- **Comprehensive Word Information**
  - Word definitions with translations
  - IPA pronunciation guide
  - Example sentences
  - Word types (noun, verb, adjective, etc.)
  - Language levels (A1-C2 CEFR)
  - Topic categorization
  - Related words (synonyms, antonyms, derivatives)

### 🎨 Beautiful UI/UX
- **Chameleon Theme**: Colorful, adaptive design inspired by the chameleon's ability to adapt
- **Glassmorphism Effects**: Modern frosted glass aesthetic
- **Smooth Animations**: Floating background elements and transitions
- **Mobile-First Design**: Responsive layout optimized for all screen sizes
- **Bottom Navigation**: Easy thumb-accessible navigation

### 🌍 Multi-language Support
- **Interface Languages**: English (default) and Vietnamese
- **Extensible i18n System**: Easy to add more languages
- **Preference Storage**: User language preferences saved to MongoDB

### 🏗️ Architecture
- **Atomic Design Pattern**:
  - **Atoms**: Button, Input, TextArea, Select, Badge, Card
  - **Molecules**: SearchBar, VocabularyCard, TopBar, BottomNavigation, StatsCard
  - **Organisms**: VocabularyList, VocabularyForm
  - **Templates**: MainLayout
  - **Pages**: Home, AddVocabulary, VocabularyDetail, Explore, Progress, Profile

### 💾 Database
- **MongoDB Backend**: Full-featured NoSQL database
- **Rust Integration**: Native MongoDB driver with async/await support
- **Schema Design**: Structured data models for vocabularies and user preferences

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **React Router DOM 7** - Navigation
- **React i18next** - Internationalization
- **Lucide React** - Icon library

### Backend
- **Tauri 2** - Desktop/mobile app framework
- **Rust** - Backend language
- **MongoDB 3.x** - Database
- **Tokio** - Async runtime
- **Serde** - Serialization/deserialization

## 📦 Installation

### Prerequisites
- Node.js 18+ and pnpm
- Rust 1.70+
- MongoDB (local or cloud instance)

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

3. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Default connection: `mongodb://localhost:27017`
   - Database name: `cham_lang`

4. **Build Rust backend**
   ```bash
   cargo build --manifest-path=src-tauri/Cargo.toml
   ```

5. **Run in development mode**
   ```bash
   pnpm tauri dev
   ```

## 🚀 Usage

### First Run
1. Launch the application
2. Go to Profile page (bottom navigation)
3. Enter your MongoDB connection string
4. Click "Connect" to establish database connection

### Adding Vocabulary
1. Click "Add Word" button on home page
2. Fill in word details:
   - Word text
   - Word type
   - Level (A1-C2)
   - IPA pronunciation
   - Definitions (with translations)
   - Example sentences
   - Topics
3. Click "Save"

### Exploring Vocabulary
- **Home**: Browse all words with search functionality
- **Explore**: Browse by topics or language levels
- **Progress**: Track your learning statistics
- **Profile**: Manage settings and database connection

### Searching
- Use the search bar on home page
- Filter by word type, level, or topics
- Real-time search results

## 📁 Project Structure

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
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services
│   └── utils/              # Utility functions
├── src-tauri/
│   └── src/
│       ├── models.rs       # Data models
│       ├── database.rs     # Database manager
│       ├── commands.rs     # Tauri commands
│       └── lib.rs          # Main entry point
└── README.md
```

## 🔧 Configuration

### Tailwind CSS
The project uses Tailwind CSS 4 with custom chameleon theme colors:
- Primary: Teal/Cyan gradient
- Secondary: Amber/Orange gradient
- Accent colors: Emerald, Orange, Pink

### i18n
Add new languages by:
1. Creating a new locale folder in `src/i18n/locales/`
2. Adding translation JSON file
3. Importing in `src/i18n/config.ts`
4. Adding to language selector in Profile page

## 📱 Mobile/Android Support

### Current Status
The app is built with Tauri 2, which supports Android development. However, MongoDB integration requires testing on Android platform.

### Known Considerations
- MongoDB connection on mobile may require:
  - Cloud MongoDB Atlas instance
  - Network permissions configuration
  - Connection string adjustments for mobile networks

### Building for Android
```bash
pnpm tauri android init
pnpm tauri android dev
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod`
- Check connection string format
- Verify network accessibility
- Check firewall settings

### TypeScript Errors
```bash
pnpm tsc --noEmit
```

### Rust Compilation Errors
```bash
cargo check --manifest-path=src-tauri/Cargo.toml
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

[Add your license here]

## 🙏 Acknowledgments

- **Tauri Team** - For the amazing cross-platform framework
- **MongoDB** - For the flexible NoSQL database
- **React Team** - For the UI library
- **Tailwind CSS** - For the utility-first CSS framework

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review MongoDB connection guides

---

Made with 🦎 by the Chameleon Team
