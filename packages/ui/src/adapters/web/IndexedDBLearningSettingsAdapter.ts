import type {
  ILearningSettingsService,
  UpdateLearningSettingsRequest,
} from "@cham-lang/ui/adapters/factory/interfaces";
import type { LearningSettings } from "@cham-lang/shared/types";
import { DEFAULT_LEARNING_SETTINGS } from "@cham-lang/shared/types";
import { db, generateId, getCurrentTimestamp } from "./database";

export class IndexedDBLearningSettingsAdapter implements ILearningSettingsService {
  async getLearningSettings(): Promise<LearningSettings | null> {
    const settings = await db.learningSettings.limit(1).first();
    return (settings as LearningSettings) || null;
  }

  async getOrCreateLearningSettings(): Promise<LearningSettings> {
    const existing = await this.getLearningSettings();
    if (existing) return existing;

    const now = getCurrentTimestamp();
    const settings = {
      id: generateId(),
      ...DEFAULT_LEARNING_SETTINGS,
      created_at: now,
      updated_at: now,
    };

    await db.learningSettings.add(settings);
    return settings as LearningSettings;
  }

  async updateLearningSettings(
    request: UpdateLearningSettingsRequest,
  ): Promise<LearningSettings> {
    const existing = await this.getOrCreateLearningSettings();

    const updated = {
      ...existing,
      ...request,
      updated_at: getCurrentTimestamp(),
    };

    await db.learningSettings.update(existing.id!, updated);
    return updated as LearningSettings;
  }
}
