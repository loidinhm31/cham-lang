export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export type WordType =
  | "n/a"
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "interjection"
  | "phrase";

// Level is now flexible based on language - stored as string
export type LanguageLevel = string;

export type WordRelationship =
  | "synonym"
  | "antonym"
  | "similar"
  | "related"
  | "derivative";

export interface Definition {
  meaning: string;
  translation?: string;
  example?: string;
}

export interface RelatedWord {
  wordId?: string;
  word: string;
  relationship: WordRelationship;
}

export interface Vocabulary {
  id?: string;
  word: string;
  wordType: WordType;
  level: LanguageLevel;
  ipa: string;
  audioUrl?: string; // Optional audio pronunciation URL
  concept?: string; // Optional concept field for alternative learning mode
  definitions: Definition[];
  exampleSentences: string[];
  topics: string[];
  tags: string[];
  relatedWords: RelatedWord[];
  createdAt: string;
  updatedAt: string;
  language: string;
  collectionId: string;
}

export interface CreateVocabularyRequest {
  word: string;
  wordType: WordType;
  level: LanguageLevel;
  ipa: string;
  audioUrl?: string;
  concept?: string;
  definitions: Definition[];
  exampleSentences: string[];
  topics: string[];
  tags: string[];
  relatedWords: RelatedWord[];
  language: string;
  collectionId: string;
}

export interface UpdateVocabularyRequest {
  id: string;
  word?: string;
  wordType?: WordType;
  level?: LanguageLevel;
  ipa?: string;
  audioUrl?: string;
  concept?: string;
  definitions?: Definition[];
  exampleSentences?: string[];
  topics?: string[];
  tags?: string[];
  relatedWords?: RelatedWord[];
  collectionId?: string;
}

export interface BulkMoveRequest {
  vocabularyIds: string[];
  targetCollectionId: string;
}

export interface BulkMoveResult {
  movedCount: number;
  skippedCount: number;
}

export interface SearchQuery {
  query: string;
  wordType?: WordType;
  level?: LanguageLevel;
  topics?: string[];
  language?: string;
}
