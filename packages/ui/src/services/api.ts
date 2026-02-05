/**
 * ChamLang API Facade
 * Centralized API layer with error handling
 * Pattern from fin-catch for consistent architecture
 */

import {
  getVocabularyService,
  getCollectionService,
  getPracticeService,
  getLearningSettingsService,
  getCSVService,
  getSyncService,
  getAuthService,
} from "@cham-lang/ui/adapters/factory";
import type {
  Vocabulary,
  CreateVocabularyRequest,
  UpdateVocabularyRequest,
  SearchQuery,
  BulkMoveResult,
  PaginatedResponse,
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  PracticeSession,
  CreatePracticeSessionRequest,
  UpdateProgressRequest,
  UserPracticeProgress,
  WordProgress,
  LearningSettings,
} from "@cham-lang/shared/types";
import type {
  UpdateLearningSettingsRequest,
  ImportCSVRequest,
  SimpleImportRequest,
  ImportResult,
} from "@cham-lang/ui/adapters/factory/interfaces";
import type {
  AuthResponse,
  AuthStatus,
  SyncConfig,
  SyncResult,
  SyncStatus,
} from "@cham-lang/shared/types";

class ChamLangAPI {
  //==========================================================================
  // Vocabulary Operations
  //==========================================================================

  async createVocabulary(request: CreateVocabularyRequest): Promise<string> {
    try {
      return await getVocabularyService().createVocabulary(request);
    } catch (error) {
      console.error("Error creating vocabulary:", error);
      throw this.handleError(error);
    }
  }

  async getVocabulary(id: string): Promise<Vocabulary> {
    try {
      return await getVocabularyService().getVocabulary(id);
    } catch (error) {
      console.error("Error getting vocabulary:", error);
      throw this.handleError(error);
    }
  }

  async getAllVocabularies(
    language?: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    try {
      return await getVocabularyService().getAllVocabularies(language, limit);
    } catch (error) {
      console.error("Error getting all vocabularies:", error);
      throw this.handleError(error);
    }
  }

  async updateVocabulary(request: UpdateVocabularyRequest): Promise<string> {
    try {
      return await getVocabularyService().updateVocabulary(request);
    } catch (error) {
      console.error("Error updating vocabulary:", error);
      throw this.handleError(error);
    }
  }

  async deleteVocabulary(id: string): Promise<string> {
    try {
      return await getVocabularyService().deleteVocabulary(id);
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      throw this.handleError(error);
    }
  }

  async bulkMoveVocabularies(
    vocabularyIds: string[],
    targetCollectionId: string,
  ): Promise<BulkMoveResult> {
    try {
      return await getVocabularyService().bulkMoveVocabularies(
        vocabularyIds,
        targetCollectionId,
      );
    } catch (error) {
      console.error("Error bulk moving vocabularies:", error);
      throw this.handleError(error);
    }
  }

  async searchVocabularies(query: SearchQuery): Promise<Vocabulary[]> {
    try {
      return await getVocabularyService().searchVocabularies(query);
    } catch (error) {
      console.error("Error searching vocabularies:", error);
      throw this.handleError(error);
    }
  }

  async getVocabulariesByTopic(
    topic: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    try {
      return await getVocabularyService().getVocabulariesByTopic(
        topic,
        language,
      );
    } catch (error) {
      console.error("Error getting vocabularies by topic:", error);
      throw this.handleError(error);
    }
  }

  async getVocabulariesByLevel(
    level: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    try {
      return await getVocabularyService().getVocabulariesByLevel(
        level,
        language,
      );
    } catch (error) {
      console.error("Error getting vocabularies by level:", error);
      throw this.handleError(error);
    }
  }

  async getVocabulariesByCollection(
    collectionId: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    try {
      return await getVocabularyService().getVocabulariesByCollection(
        collectionId,
        limit,
      );
    } catch (error) {
      console.error("Error getting vocabularies by collection:", error);
      throw this.handleError(error);
    }
  }

  async getVocabulariesByCollectionPaginated(
    collectionId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Vocabulary>> {
    try {
      return await getVocabularyService().getVocabulariesByCollectionPaginated(
        collectionId,
        limit,
        offset,
      );
    } catch (error) {
      console.error("Error getting paginated vocabularies:", error);
      throw this.handleError(error);
    }
  }

  async getAllLanguages(): Promise<string[]> {
    try {
      return await getVocabularyService().getAllLanguages();
    } catch (error) {
      console.error("Error getting all languages:", error);
      throw this.handleError(error);
    }
  }

  async getAllTopics(): Promise<string[]> {
    try {
      return await getVocabularyService().getAllTopics();
    } catch (error) {
      console.error("Error getting all topics:", error);
      throw this.handleError(error);
    }
  }

  async getAllTags(): Promise<string[]> {
    try {
      return await getVocabularyService().getAllTags();
    } catch (error) {
      console.error("Error getting all tags:", error);
      throw this.handleError(error);
    }
  }

  //==========================================================================
  // Collection Operations
  //==========================================================================

  async createCollection(request: CreateCollectionRequest): Promise<string> {
    try {
      return await getCollectionService().createCollection(request);
    } catch (error) {
      console.error("Error creating collection:", error);
      throw this.handleError(error);
    }
  }

  async getCollection(id: string): Promise<Collection> {
    try {
      return await getCollectionService().getCollection(id);
    } catch (error) {
      console.error("Error getting collection:", error);
      throw this.handleError(error);
    }
  }

  async getUserCollections(): Promise<Collection[]> {
    try {
      return await getCollectionService().getUserCollections();
    } catch (error) {
      console.error("Error getting user collections:", error);
      throw this.handleError(error);
    }
  }

  async getPublicCollections(language?: string): Promise<Collection[]> {
    try {
      return await getCollectionService().getPublicCollections(language);
    } catch (error) {
      console.error("Error getting public collections:", error);
      throw this.handleError(error);
    }
  }

  async updateCollection(request: UpdateCollectionRequest): Promise<string> {
    try {
      return await getCollectionService().updateCollection(request);
    } catch (error) {
      console.error("Error updating collection:", error);
      throw this.handleError(error);
    }
  }

  async deleteCollection(id: string): Promise<string> {
    try {
      return await getCollectionService().deleteCollection(id);
    } catch (error) {
      console.error("Error deleting collection:", error);
      throw this.handleError(error);
    }
  }

  async shareCollection(
    collectionId: string,
    shareWithUsername: string,
  ): Promise<string> {
    try {
      return await getCollectionService().shareCollection(
        collectionId,
        shareWithUsername,
      );
    } catch (error) {
      console.error("Error sharing collection:", error);
      throw this.handleError(error);
    }
  }

  async unshareCollection(
    collectionId: string,
    userIdToRemove: string,
  ): Promise<string> {
    try {
      return await getCollectionService().unshareCollection(
        collectionId,
        userIdToRemove,
      );
    } catch (error) {
      console.error("Error unsharing collection:", error);
      throw this.handleError(error);
    }
  }

  async updateCollectionWordCount(collectionId: string): Promise<void> {
    try {
      return await getCollectionService().updateCollectionWordCount(
        collectionId,
      );
    } catch (error) {
      console.error("Error updating collection word count:", error);
      throw this.handleError(error);
    }
  }

  async getLevelConfiguration(language: string): Promise<string[]> {
    try {
      return await getCollectionService().getLevelConfiguration(language);
    } catch (error) {
      console.error("Error getting level configuration:", error);
      throw this.handleError(error);
    }
  }

  //==========================================================================
  // Practice Operations
  //==========================================================================

  async createPracticeSession(
    request: CreatePracticeSessionRequest,
  ): Promise<string> {
    try {
      return await getPracticeService().createPracticeSession(request);
    } catch (error) {
      console.error("Error creating practice session:", error);
      throw this.handleError(error);
    }
  }

  async getPracticeSessions(
    language: string,
    limit?: number,
  ): Promise<PracticeSession[]> {
    try {
      return await getPracticeService().getPracticeSessions(language, limit);
    } catch (error) {
      console.error("Error getting practice sessions:", error);
      throw this.handleError(error);
    }
  }

  async updatePracticeProgress(
    request: UpdateProgressRequest,
  ): Promise<string> {
    try {
      return await getPracticeService().updatePracticeProgress(request);
    } catch (error) {
      console.error("Error updating practice progress:", error);
      throw this.handleError(error);
    }
  }

  async getPracticeProgress(
    language: string,
  ): Promise<UserPracticeProgress | null> {
    try {
      return await getPracticeService().getPracticeProgress(language);
    } catch (error) {
      console.error("Error getting practice progress:", error);
      throw this.handleError(error);
    }
  }

  async getWordProgress(
    language: string,
    vocabularyId: string,
  ): Promise<WordProgress | null> {
    try {
      return await getPracticeService().getWordProgress(language, vocabularyId);
    } catch (error) {
      console.error("Error getting word progress:", error);
      throw this.handleError(error);
    }
  }

  //==========================================================================
  // Learning Settings Operations
  //==========================================================================

  async getLearningSettings(): Promise<LearningSettings | null> {
    try {
      return await getLearningSettingsService().getLearningSettings();
    } catch (error) {
      console.error("Error getting learning settings:", error);
      throw this.handleError(error);
    }
  }

  async getOrCreateLearningSettings(): Promise<LearningSettings> {
    try {
      return await getLearningSettingsService().getOrCreateLearningSettings();
    } catch (error) {
      console.error("Error getting or creating learning settings:", error);
      throw this.handleError(error);
    }
  }

  async updateLearningSettings(
    request: UpdateLearningSettingsRequest,
  ): Promise<LearningSettings> {
    try {
      return await getLearningSettingsService().updateLearningSettings(request);
    } catch (error) {
      console.error("Error updating learning settings:", error);
      throw this.handleError(error);
    }
  }

  //==========================================================================
  // CSV Operations
  //==========================================================================

  async getExportDirectory(): Promise<string> {
    try {
      return await getCSVService().getExportDirectory();
    } catch (error) {
      console.error("Error getting export directory:", error);
      throw this.handleError(error);
    }
  }

  async exportCollectionsCSV(
    collectionIds: string[],
    exportPath?: string,
  ): Promise<string> {
    try {
      return await getCSVService().exportCollectionsCSV(
        collectionIds,
        exportPath,
      );
    } catch (error) {
      console.error("Error exporting CSV:", error);
      throw this.handleError(error);
    }
  }

  async chooseCSVSaveLocation(defaultName: string): Promise<string | null> {
    try {
      return await getCSVService().chooseCSVSaveLocation(defaultName);
    } catch (error) {
      console.error("Error choosing CSV save location:", error);
      throw this.handleError(error);
    }
  }

  async openExportDirectory(): Promise<void> {
    try {
      return await getCSVService().openExportDirectory();
    } catch (error) {
      console.error("Error opening export directory:", error);
      throw this.handleError(error);
    }
  }

  async importVocabulariesCSV(
    request: ImportCSVRequest,
  ): Promise<ImportResult> {
    try {
      return await getCSVService().importVocabulariesCSV(request);
    } catch (error) {
      console.error("Error importing CSV:", error);
      throw this.handleError(error);
    }
  }

  async importSimpleVocabularies(
    request: SimpleImportRequest,
  ): Promise<ImportResult> {
    try {
      return await getCSVService().importSimpleVocabularies(request);
    } catch (error) {
      console.error("Error simple importing:", error);
      throw this.handleError(error);
    }
  }

  async generateCSVTemplate(filePath: string): Promise<string> {
    try {
      return await getCSVService().generateCSVTemplate(filePath);
    } catch (error) {
      console.error("Error generating CSV template:", error);
      throw this.handleError(error);
    }
  }

  //==========================================================================
  // Authentication Operations
  //==========================================================================

  async authConfigureSync(config: SyncConfig): Promise<void> {
    try {
      await getAuthService().configureSync(config);
    } catch (error) {
      console.error("Error configuring sync:", error);
      throw this.handleError(error);
    }
  }

  async authRegister(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    try {
      return await getAuthService().register(username, email, password);
    } catch (error) {
      console.error("Error registering user:", error);
      throw this.handleError(error);
    }
  }

  async authLogin(email: string, password: string): Promise<AuthResponse> {
    try {
      return await getAuthService().login(email, password);
    } catch (error) {
      console.error("Error logging in:", error);
      throw this.handleError(error);
    }
  }

  async authLogout(): Promise<void> {
    try {
      await getAuthService().logout();
    } catch (error) {
      console.error("Error logging out:", error);
      throw this.handleError(error);
    }
  }

  async authRefreshToken(): Promise<void> {
    try {
      await getAuthService().refreshToken();
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw this.handleError(error);
    }
  }

  async authGetStatus(): Promise<AuthStatus> {
    try {
      return await getAuthService().getStatus();
    } catch (error) {
      console.error("Error getting auth status:", error);
      return { isAuthenticated: false };
    }
  }

  async authIsAuthenticated(): Promise<boolean> {
    try {
      return await getAuthService().isAuthenticated();
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  }

  //==========================================================================
  // Sync Operations
  //==========================================================================

  async syncNow(): Promise<SyncResult> {
    try {
      return await getSyncService().syncNow();
    } catch (error) {
      console.error("Error syncing:", error);
      throw this.handleError(error);
    }
  }

  async syncGetStatus(): Promise<SyncStatus> {
    try {
      return await getSyncService().getStatus();
    } catch (error) {
      console.error("Error getting sync status:", error);
      return {
        configured: false,
        authenticated: false,
        pendingChanges: 0,
      };
    }
  }

  //==========================================================================
  // Error Handling
  //==========================================================================

  private handleError(error: unknown): Error {
    if (typeof error === "string") {
      return new Error(error);
    }
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
}

// Create and export a singleton instance
export const chamLangAPI = new ChamLangAPI();

// Export the class for testing purposes
export { ChamLangAPI };
