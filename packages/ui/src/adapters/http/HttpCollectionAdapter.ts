/**
 * HTTP Collection Adapter
 * Communicates with desktop SQLite backend via HTTP REST API
 */

import { HttpAdapter } from "./HttpAdapter";
import type { ICollectionService } from "@cham-lang/ui/adapters/factory/interfaces";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@cham-lang/shared/types";

export class HttpCollectionAdapter
  extends HttpAdapter
  implements ICollectionService
{
  async createCollection(request: CreateCollectionRequest): Promise<string> {
    return this.post<string>("/collections", request);
  }

  async getCollection(id: string): Promise<Collection> {
    return this.get<Collection>(`/collections/${id}`);
  }

  async getUserCollections(): Promise<Collection[]> {
    return this.get<Collection[]>("/collections/user");
  }

  async getPublicCollections(language?: string): Promise<Collection[]> {
    return this.get<Collection[]>("/collections/public", { language });
  }

  async updateCollection(request: UpdateCollectionRequest): Promise<string> {
    return this.put<string>("/collections", request);
  }

  async deleteCollection(id: string): Promise<string> {
    return this.delete<string>(`/collections/${id}`);
  }

  async shareCollection(
    collectionId: string,
    shareWithUsername: string,
  ): Promise<string> {
    return this.post<string>(
      `/collections/${collectionId}/share/${shareWithUsername}`,
      {},
    );
  }

  async unshareCollection(
    collectionId: string,
    userIdToRemove: string,
  ): Promise<string> {
    return this.post<string>(
      `/collections/${collectionId}/unshare/${userIdToRemove}`,
      {},
    );
  }

  async updateCollectionWordCount(_collectionId: string): Promise<void> {
    // This is handled automatically on the backend when vocabularies are added/removed
    // No-op for HTTP adapter
    return Promise.resolve();
  }

  async getLevelConfiguration(language: string): Promise<string[]> {
    return this.get<string[]>(`/metadata/levels/${language}`);
  }
}
