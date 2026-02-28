import type {
  ILearningSettingsService,
  UpdateLearningSettingsRequest,
} from "@cham-lang/ui/adapters/factory/interfaces";
import type { LearningSettings } from "@cham-lang/shared/types";
import { DEFAULT_LEARNING_SETTINGS } from "@cham-lang/shared/types";
import {
  getDb,
  generateId,
  getCurrentTimestamp,
  type IDBLearningSettings,
} from "./database";

export class IndexedDBLearningSettingsAdapter implements ILearningSettingsService {
  async getLearningSettings(): Promise<LearningSettings | null> {
    const settings = await getDb().learningSettings.limit(1).first();
    return (settings as LearningSettings) || null;
  }

  async getOrCreateLearningSettings(): Promise<LearningSettings> {
    const existing = await this.getLearningSettings();
    if (existing) return existing;

    const now = getCurrentTimestamp();
    const settings = {
      id: generateId(),
      ...DEFAULT_LEARNING_SETTINGS,
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
      syncedAt: undefined,
    };

    await getDb().learningSettings.add(settings);
    return settings as LearningSettings;
  }

  async updateLearningSettings(
    request: UpdateLearningSettingsRequest,
  ): Promise<LearningSettings> {
    // Read raw IDB record to access sync fields (syncVersion) not exposed on LearningSettings
    const rawExisting = (await getDb().learningSettings.limit(1).first()) as
      | IDBLearningSettings
      | undefined;
    if (!rawExisting) {
      await this.getOrCreateLearningSettings();
      return this.updateLearningSettings(request);
    }

    const updated: IDBLearningSettings = {
      ...rawExisting,
      ...request,
      updatedAt: getCurrentTimestamp(),
      syncVersion: (rawExisting.syncVersion ?? 0) + 1,
      syncedAt: undefined,
    };

    await getDb().learningSettings.update(rawExisting.id, updated);
    return updated as unknown as LearningSettings;
  }
}
