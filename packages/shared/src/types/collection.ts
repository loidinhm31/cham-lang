export interface SharedUser {
  userId: string;
  permission: "viewer" | "editor";
}

export interface Collection {
  id?: string;
  name: string;
  description: string;
  language: string;
  sharedBy?: string;
  sharedWith: SharedUser[];
  isPublic: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export const getCollectionId = (collection: Collection): string | undefined => {
  if (collection.id) {
    return collection.id as string;
  }
  return collection.id;
};

export interface CreateCollectionRequest {
  name: string;
  description: string;
  language: string;
  isPublic: boolean;
}

export interface UpdateCollectionRequest {
  id: string;
  name?: string;
  description?: string;
  isPublic?: boolean;
  sharedWith?: SharedUser[];
}
