import type {
  ILearningSettingsService,
  UpdateLearningSettingsRequest,
} from "@cham-lang/shared/services";
import type { LearningSettings } from "@cham-lang/shared/types";
import { DEFAULT_LEARNING_SETTINGS } from "@cham-lang/shared/types";
import { db, generateId, getCurrentTimestamp } from "./database";

export class IndexedDBLearningSettingsAdapter implements ILearningSettingsService {
  async getLearningSettings(): Promise<LearningSettings | null> {
    const settings = await db.learningSettings
      .where("user_id")
      .equals("local")
      .first();
    return (settings as LearningSettings) || null;
  }

  async getOrCreateLearningSettings(): Promise<LearningSettings> {
    const existing = await this.getLearningSettings();
    if (existing) return existing;

    const now = getCurrentTimestamp();
    const settings = {
      id: generateId(),
      user_id: "local",
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
