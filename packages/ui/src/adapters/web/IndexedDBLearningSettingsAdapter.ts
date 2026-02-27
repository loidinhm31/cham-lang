import type {
  ILearningSettingsService,
  UpdateLearningSettingsRequest,
} from "@cham-lang/ui/adapters/factory/interfaces";
import type { LearningSettings } from "@cham-lang/shared/types";
import { DEFAULT_LEARNING_SETTINGS } from "@cham-lang/shared/types";
import { getDb, generateId, getCurrentTimestamp } from "./database";

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
    };

    await getDb().learningSettings.add(settings);
    return settings as LearningSettings;
  }

  async updateLearningSettings(
    request: UpdateLearningSettingsRequest,
  ): Promise<LearningSettings> {
    const existing = await this.getOrCreateLearningSettings();

    const updated = {
      ...existing,
      ...request,
      updatedAt: getCurrentTimestamp(),
    };

    await getDb().learningSettings.update(existing.id!, updated);
    return updated as LearningSettings;
  }
}
