export type WordType =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'phrase';

export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type WordRelationship =
  | 'synonym'
  | 'antonym'
  | 'similar'
  | 'related'
  | 'derivative';

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
  id?: string;
  word: string;
  word_type: WordType;
  level: LanguageLevel;
  ipa: string;
  definitions: Definition[];
  example_sentences: string[];
  topics: string[];
  related_words: RelatedWord[];
  created_at: string;
  updated_at: string;
  language: string;
}

export interface CreateVocabularyRequest {
  word: string;
  word_type: WordType;
  level: LanguageLevel;
  ipa: string;
  definitions: Definition[];
  example_sentences: string[];
  topics: string[];
  related_words: RelatedWord[];
  language: string;
}

export interface UpdateVocabularyRequest {
  id: string;
  word?: string;
  word_type?: WordType;
  level?: LanguageLevel;
  ipa?: string;
  definitions?: Definition[];
  example_sentences?: string[];
  topics?: string[];
  related_words?: RelatedWord[];
}

export interface SearchQuery {
  query: string;
  word_type?: WordType;
  level?: LanguageLevel;
  topics?: string[];
  language?: string;
}

export interface UserPreferences {
  id?: string;
  interface_language: string;
  native_language: string;
  learning_languages: string[];
  theme: string;
  created_at: string;
  updated_at: string;
}
