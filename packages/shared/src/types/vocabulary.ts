export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
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
  word_id?: string;
  word: string;
  relationship: WordRelationship;
}

export interface Vocabulary {
  id?: string; // Rust field name
  word: string;
  word_type: WordType;
  level: LanguageLevel;
  ipa: string;
  audio_url?: string; // Optional audio pronunciation URL
  concept?: string; // Optional concept field for alternative learning mode
  definitions: Definition[];
  example_sentences: string[];
  topics: string[];
  tags: string[];
  related_words: RelatedWord[];
  created_at: string;
  updated_at: string;
  language: string;
  collection_id: string;
}

export interface CreateVocabularyRequest {
  word: string;
  word_type: WordType;
  level: LanguageLevel;
  ipa: string;
  audio_url?: string;
  concept?: string;
  definitions: Definition[];
  example_sentences: string[];
  topics: string[];
  tags: string[];
  related_words: RelatedWord[];
  language: string;
  collection_id: string;
}

export interface UpdateVocabularyRequest {
  id: string;
  word?: string;
  word_type?: WordType;
  level?: LanguageLevel;
  ipa?: string;
  audio_url?: string;
  concept?: string;
  definitions?: Definition[];
  example_sentences?: string[];
  topics?: string[];
  tags?: string[];
  related_words?: RelatedWord[];
  collection_id?: string;
}

export interface BulkMoveRequest {
  vocabulary_ids: string[];
  target_collection_id: string;
}

export interface BulkMoveResult {
  moved_count: number;
  skipped_count: number;
}

export interface SearchQuery {
  query: string;
  word_type?: WordType;
  level?: LanguageLevel;
  topics?: string[];
  language?: string;
}
