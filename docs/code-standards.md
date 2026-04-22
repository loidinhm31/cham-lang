# Code Standards & Conventions

Guidelines for maintaining consistency across cham-lang codebase.

## Naming Conventions

### Files

| Type | Pattern | Examples |
|------|---------|----------|
| Component | PascalCase.tsx | `Button.tsx`, `VocabularyList.tsx`, `ChamLangApp.tsx` |
| Hook | use{Name}.ts | `useVocabularies.ts`, `useAuth.ts`, `useNav.ts` |
| Service | {Name}Service.ts | `AuthService.ts`, `VocabularyService.ts` |
| Adapter | {Name}Adapter.ts | `IndexedDBVocabularyAdapter.ts`, `TauriNotificationAdapter.ts` |
| Interface | I{Name}.ts | `IVocabularyService.ts`, `IAuthService.ts` |
| Utility | {name}.ts | `sessionManager.ts`, `platform.ts`, `logger.ts` |
| Test | {name}.test.ts | `softDelete.test.ts`, `sessionManager.test.ts` |
| Config | {name}.ts or {name}.json | `vite.config.ts`, `tauri.conf.json` |
| CSS | global.css, {component}.module.css | `global.css` (Tailwind only, no module CSS) |

### TypeScript Identifiers

| Type | Pattern | Notes |
|------|---------|-------|
| Types | PascalCase | `Vocabulary`, `Collection`, `WordProgress`, `AuthTokens` |
| Interfaces | PascalCase or IPascalCase | `ThemeContextType`, `ServiceFactory` (both OK) |
| Enums | PascalCase | `WordType`, `CEFRLevel`, `AlgorithmType` |
| Functions | camelCase | `addVocabulary()`, `getDueWords()` |
| Variables | camelCase | `vocabularies`, `isLoading`, `userId` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_BOX_COUNT`, `SYNC_LOCK_NAME` |
| Booleans | is{Name}, has{Name}, can{Name} | `isLoading`, `hasError`, `canEdit` |

### Database Fields (IndexedDB)

**All synced tables use camelCase** (matches server JSON):

```ts
// Correct
interface Vocabulary {
  id: string;
  word: string;
  wordType: WordType;
  syncVersion: number;
  syncedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deleted: 0 | 1;
  deletedAt: number | null;
}

// Wrong
interface Vocabulary {
  id: string;
  word: string;
  word_type: WordType;  // ❌ snake_case breaks sync
  syncedAt?: number;     // ❌ undefined ≠ null; use null for "not synced"
}
```

### CSS Classes & Variables

| Type | Pattern | Examples |
|------|---------|----------|
| Tailwind utility | kebab-case | `bg-white`, `text-gray-600`, `rounded-lg` |
| CSS custom property | --kebab-case | `--color-bg-app`, `--color-primary-500` |
| CSS class for component | PascalCase or kebab-case | `.clay-card`, `.glass-panel`, `.btn-primary` |
| Theme CSS class | lowercase | `.dark`, `.chameleon`, `.cyber`, `.simple` |
| data-* attribute | kebab-case | `data-theme="dark"`, `data-testid="vocab-card"` |

## Component Patterns

### Atomic Design Rules

**Atoms** → **Molecules** → **Organisms** → **Pages** → **Templates**

```tsx
// Atoms: pure, composable, no business logic
export const Button: React.FC<ButtonProps> = ({ children, onClick, ...props }) => (
  <button onClick={onClick} className="btn-primary" {...props}>
    {children}
  </button>
);

// Molecules: combine atoms, lightweight business logic
export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => (
  <div className="flex gap-2">
    <Input placeholder="Search..." value={value} onChange={onChange} />
    <Button>Search</Button>
  </div>
);

// Organisms: combine molecules, significant business logic
export const VocabularyList: React.FC<VocabularyListProps> = ({ collectionId }) => {
  const { vocabularies, loading } = useVocabularies({ collectionId });
  return (
    <div>
      <SearchBar />
      {vocabularies.map(v => <VocabularyCard key={v.id} vocab={v} />)}
    </div>
  );
};

// Pages: route-level components, orchestrate organisms
export const CollectionDetailPage: React.FC = () => {
  const { collectionId } = useParams();
  return (
    <MainLayout>
      <TopBar title="Collection" />
      <VocabularyList collectionId={collectionId} />
      <ShareCollectionDialog collectionId={collectionId} />
    </MainLayout>
  );
};
```

### Hook Patterns

Use `useState` for local state, call service getters from ServiceFactory:

```tsx
// Good hook pattern
const useVocabularies = (filter?: Filter) => {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const service = getVocabularyService(); // ServiceFactory getter
        const data = await service.list(filter);
        setVocabularies(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filter]);

  const addVocabulary = async (input: VocabularyInput) => {
    try {
      const service = getVocabularyService();
      const vocab = await service.add(input);
      setVocabularies(prev => [...prev, vocab]);
      return vocab;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
      throw err;
    }
  };

  return { vocabularies, loading, error, addVocabulary, ... };
};

// Bad — direct adapter import (violates invariant)
import { IndexedDBVocabularyAdapter } from "@/adapters/web/vocabulary"; // ❌
```

### Service & Adapter Patterns

**Services** wrap business logic; **adapters** implement service interfaces for specific platforms:

```tsx
// Service interface (packages/ui/src/adapters/factory/interfaces/)
export interface IVocabularyService {
  list(filter?: Filter): Promise<Vocabulary[]>;
  get(id: string): Promise<Vocabulary | null>;
  add(input: VocabularyInput): Promise<Vocabulary>;
  update(id: string, patch: Partial<Vocabulary>): Promise<Vocabulary>;
  delete(id: string): Promise<void>;
}

// IndexedDB adapter (packages/ui/src/adapters/web/)
export class IndexedDBVocabularyAdapter implements IVocabularyService {
  async list(filter?: Filter): Promise<Vocabulary[]> {
    const db = getDatabase();
    let query = db.vocabularies.where('deleted').equals(0);
    if (filter?.collectionId) {
      query = query.and(v => v.collectionId === filter.collectionId);
    }
    return query.toArray();
  }

  async add(input: VocabularyInput): Promise<Vocabulary> {
    const db = getDatabase();
    const vocab: Vocabulary = {
      ...input,
      id: generateUUID(),
      syncVersion: Date.now(),
      syncedAt: null, // ← REQUIRED for sync detection
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: 0,
      deletedAt: null,
    };
    await db.vocabularies.add(vocab);
    return vocab;
  }

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    // Soft-delete only
    await db.vocabularies.update(id, {
      deleted: 1,
      deletedAt: Date.now(),
      syncVersion: Date.now(),
      syncedAt: null,
    });
  }
}

// ServiceFactory pattern (packages/ui/src/adapters/factory/)
let vocabularyService: IVocabularyService | null = null;

export const setVocabularyService = (service: IVocabularyService) => {
  vocabularyService = service;
};

export const getVocabularyService = (): IVocabularyService => {
  if (!vocabularyService) throw new Error("VocabularyService not initialized");
  return vocabularyService;
};
```

### Form Component Pattern

Use react-hook-form + Radix UI primitives:

```tsx
export const VocabularyForm: React.FC<VocabularyFormProps> = ({ initial, onSubmit }) => {
  const { control, handleSubmit, formState: { errors } } = useForm<VocabularyInput>({
    defaultValues: initial,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        control={control}
        name="word"
        rules={{ required: "Word is required" }}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium mb-1">Word</label>
            <Input placeholder="Enter word" {...field} />
            {errors.word && <span className="text-red-500">{errors.word.message}</span>}
          </div>
        )}
      />

      <Button type="submit" className="btn-primary">
        Submit
      </Button>
    </form>
  );
};
```

## Styling & Theme Conventions

### Use CSS Variables Over Hardcoded Colors

```tsx
// Good — theme-aware
<div className="bg-(--color-bg-white) border border-(--color-border-light) rounded-lg p-4">
  <h2 className="text-(--color-text-primary)">Title</h2>
  <p className="text-(--color-text-secondary)">Description</p>
</div>

// Bad — hardcoded colors break in other themes
<div className="bg-white border border-gray-200 rounded-lg p-4">
  <h2 className="text-gray-900">Title</h2>
  <p className="text-gray-600">Description</p>
</div>
```

### Claymorphism Utilities (cham-lang-specific)

```tsx
// Preset claymorphism cards
<div className="clay-card">Card with 3D shadow</div>
<button className="clay-btn">Button with press effect</button>
<span className="clay-badge">Label</span>

// Glass panels (glassmorphic)
<div className="glass-panel">Blurred background panel</div>

// Solid action buttons
<button className="btn-primary">Primary</button>
<button className="btn-secondary">Secondary</button>
<button className="btn-success">Success</button>
<button className="btn-danger">Danger</button>
```

### No Gradients or Hardcoded Element Styles

```tsx
// Good — solid colors only
<div className="bg-indigo-500 text-white rounded-lg p-4">Content</div>

// Bad — gradients break in Shadow DOM
<div className="bg-gradient-to-br from-indigo-400 to-purple-600">❌</div>

// Bad — bare element selectors leak to parent in embedded mode
<style>{`
  body { font-family: "Custom"; } /* ❌ can override glean-oak-app */
  @layer base { body { font-family: "Custom"; } } /* ✅ safe via layer */
`}</style>
```

### App-Wide Background Color

Use inline style with CSS variable for root layout backgrounds:

```tsx
export const AppShell: React.FC = () => (
  <div style={{ background: "var(--color-bg-app)" }} className="min-h-screen">
    {/* content */}
  </div>
);
```

## Anti-Patterns to Avoid

### 1. Direct Adapter Import in Components

```tsx
// ❌ Wrong
import { IndexedDBVocabularyAdapter } from "@/adapters/web/vocabulary";
const adapter = new IndexedDBVocabularyAdapter();
const vocabs = await adapter.list();

// ✅ Correct
const service = getVocabularyService();
const vocabs = await service.list();
```

### 2. Missing Sync Columns on Write

```tsx
// ❌ Wrong — breaks sync detection
await db.vocabularies.add({
  id: generateUUID(),
  word: "hello",
  // syncVersion and syncedAt missing
});

// ✅ Correct
await db.vocabularies.add({
  id: generateUUID(),
  word: "hello",
  syncVersion: Date.now(),
  syncedAt: null, // ← REQUIRED
  createdAt: Date.now(),
  updatedAt: Date.now(),
  deleted: 0,
  deletedAt: null,
});
```

### 3. Hard Delete Instead of Soft Delete

```tsx
// ❌ Wrong
await db.vocabularies.delete(id);

// ✅ Correct
await db.vocabularies.update(id, {
  deleted: 1,
  deletedAt: Date.now(),
  syncVersion: Date.now(),
  syncedAt: null,
});
```

### 4. Bypassing SessionManager in Practice

```tsx
// ❌ Wrong — manually managing word queue
const [currentWord, setCurrentWord] = useState<Vocabulary>();
const [completed, setCompleted] = useState<number>(0);

// ✅ Correct — use SessionManager
const session = new SessionManager(userId, language, algorithm);
session.start();
const current = session.currentWord();
session.submitAnswer(answer);
```

### 5. Hardcoded Colors in Components

```tsx
// ❌ Wrong
<div style={{ backgroundColor: "#ffffff", color: "#1e1b4b" }}>

// ✅ Correct
<div className="bg-(--color-bg-white) text-(--color-text-primary)">
```

### 6. Using `dark:` Tailwind Prefix

```tsx
// ❌ Wrong — only works in dark theme, not chameleon/cyber
<div className="bg-white dark:bg-slate-900">

// ✅ Correct — uses theme CSS variables
<div className="bg-(--color-bg-white)">
```

### 7. Mutable Service State

```tsx
// ❌ Wrong — services shouldn't store mutable state
class VocabularyService {
  private cachedList: Vocabulary[] = [];
  async list() { return this.cachedList; }
}

// ✅ Correct — stateless service
class VocabularyService {
  async list() {
    const db = getDatabase();
    return db.vocabularies.toArray();
  }
}
```

## Testing Conventions

### Test File Location

```
src/
├── utils/
│   ├── sessionManager.ts
│   └── sessionManager.test.ts  ← Test in same dir as source
├── adapters/
│   └── web/
│       ├── IndexedDBVocabularyAdapter.ts
│       └── __tests__/
│           ├── softDelete.test.ts
│           └── collectionSharing.test.ts
```

### Mock ServiceFactory in Tests

```ts
import { setVocabularyService } from "@/adapters/factory";
import { describe, it, beforeEach, expect, vi } from "vitest";

describe("VocabularyForm", () => {
  const mockService = {
    list: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    setVocabularyService(mockService);
  });

  it("calls add when form is submitted", async () => {
    mockService.add.mockResolvedValue({ id: "123", word: "test", ... });
    // ... test logic
    expect(mockService.add).toHaveBeenCalledWith(expect.objectContaining({ word: "test" }));
  });
});
```

### Test Sync Operations

```ts
describe("IndexedDBSyncAdapter", () => {
  it("pushes unsynced records and updates checkpoint", async () => {
    const db = getDatabase();
    // Seed unsynced record
    await db.vocabularies.add({
      id: "vocab-1",
      word: "hello",
      syncVersion: Date.now(),
      syncedAt: null, // unsynced
      ...
    });

    const adapter = new IndexedDBSyncAdapter();
    await adapter.sync(); // should push and update checkpoint

    const updated = await db.vocabularies.get("vocab-1");
    expect(updated.syncedAt).not.toBeNull();
  });
});
```

## Import Patterns

### Path Aliases

Use `@/*` to refer to `packages/ui/src/*`:

```ts
// Good
import { VocabularyCard } from "@/components/molecules/VocabularyCard";
import { useVocabularies } from "@/hooks/useVocabularies";
import { getVocabularyService } from "@/adapters/factory";

// Avoid
import { VocabularyCard } from "../../components/molecules/VocabularyCard";
```

### Barrel Exports

Use `index.ts` to re-export from subdirectories:

```ts
// packages/ui/src/components/atoms/index.ts
export { Button } from "./Button";
export { Input } from "./Input";
export { Card } from "./Card";
// ...

// Usage in components
import { Button, Card } from "@/components/atoms";
```

### Context Provider Imports

```ts
import { PlatformContext } from "@/contexts";
import { ThemeContext } from "@/contexts";

const { vocabularyService, collectService } = useContext(PlatformContext);
const { theme, setTheme } = useContext(ThemeContext);
```

## Documentation Standards

### Component JSDoc

```tsx
/**
 * Vocabulary card displaying word, definition, and practice count.
 * Supports click-to-practice and delete actions.
 *
 * @example
 * <VocabularyCard vocab={vocab} onEdit={handleEdit} onDelete={handleDelete} />
 *
 * @param vocab - Vocabulary object to display
 * @param onEdit - Callback when edit button clicked
 * @param onDelete - Callback when delete button clicked
 * @returns JSX.Element
 */
export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  vocab,
  onEdit,
  onDelete,
}) => {
  // ...
};
```

### Inline Comments for Complex Logic

```ts
// SM-2 easiness factor adjustment
// EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
// Clamp to [1.3, 2.5] range
const newEF = Math.max(1.3, Math.min(2.5, easinessFactor + efAdjustment));
```

## Code Style

### TypeScript

- **Strict mode**: `tsconfig.json` enables `strict: true`
- **Explicit types**: Don't rely on inference for function parameters or return types
- **Null vs undefined**: Use `null` for "intentionally empty", `undefined` for "not set"
- **const/let**: Prefer `const`, use `let` only when reassignment needed

```ts
// Good
const vocabularies: Vocabulary[] = await service.list();
const loadVocabularies = async (): Promise<void> => { ... };

// Bad
let vocabularies = await service.list(); // type inferred, unclear
const loadVocabularies = async () => { ... }; // no return type
```

### React

- **Functional components only** — no class components
- **Props destructuring** in function signature
- **useCallback** for stable function references passed to child components
- **useEffect** with explicit dependency arrays

```tsx
export const MyComponent: React.FC<MyComponentProps> = ({ title, onSubmit }) => {
  const handleSubmit = useCallback((value: string) => {
    onSubmit(value);
  }, [onSubmit]);

  useEffect(() => {
    const load = async () => { ... };
    load();
  }, [dependencies]);

  return <div>{title}</div>;
};
```

### Prettier Configuration

`.prettierrc.json` in root:

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

Run: `pnpm format`

## Related Documents

- [`architecture.md`](./architecture.md) — Detailed design, invariants, anti-patterns
- [`system-architecture.md`](./system-architecture.md) — High-level architecture overview
- Root `CLAUDE.md` — Developer workflow, commands, conventions
