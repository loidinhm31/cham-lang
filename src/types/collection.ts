export interface Collection {
  id?: string;
  name: string;
  description: string;
  language: string;
  owner_id: string;
  shared_with: string[]; // User IDs
  is_public: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionRequest {
  name: string;
  description: string;
  language: string;
  is_public: boolean;
}

export interface UpdateCollectionRequest {
  id: string;
  name?: string;
  description?: string;
  is_public?: boolean;
  shared_with?: string[];
}
