/**
 * Web Learning Settings Adapter
 * Implements learning settings operations using IndexedDB via Dexie.js
 */

import type {
  ILearningSettingsService,
  UpdateLearningSettingsRequest,
} from "@/adapters";
import type {
  LearningSettings,
  SpacedRepetitionAlgorithm,
  LeitnerBoxCount,
} from "@/types/settings";
import { db, generateId, now } from "./db";

const DEFAULT_USER_ID = "local-user";

export class WebLearningSettingsAdapter implements ILearningSettingsService {
  async getLearningSettings(): Promise<LearningSettings | null> {
    const settings = await db.learningSettings
      .where("user_id")
      .equals(DEFAULT_USER_ID)
      .first();

    return settings || null;
  }

  async getOrCreateLearningSettings(): Promise<LearningSettings> {
    let settings = await this.getLearningSettings();

    if (!settings) {
      const id = generateId();
      const timestamp = now();

      const newSettings = {
        id,
        user_id: DEFAULT_USER_ID,
        sr_algorithm: "modifiedsm2" as SpacedRepetitionAlgorithm,
        leitner_box_count: 5 as LeitnerBoxCount,
        consecutive_correct_required: 3,
        show_failed_words_in_session: true,
        new_words_per_day: 20,
        daily_review_limit: 100,
        auto_advance_timeout_seconds: 2,
        show_hint_in_fillword: true,
        reminder_enabled: false,
        reminder_time: "19:00",
        created_at: timestamp,
        updated_at: timestamp,
      };

      await db.learningSettings.add(newSettings);
      settings = newSettings;
    }

    return settings;
  }

  async updateLearningSettings(
    request: UpdateLearningSettingsRequest,
  ): Promise<LearningSettings> {
    const settings = await this.getOrCreateLearningSettings();

    // Merge settings with request, preserving types
    const updatedSettings: LearningSettings & { id: string } = {
      ...settings,
      id: settings.id!, // Ensure id is present
      sr_algorithm: request.sr_algorithm ?? settings.sr_algorithm,
      leitner_box_count:
        request.leitner_box_count ?? settings.leitner_box_count,
      consecutive_correct_required:
        request.consecutive_correct_required ??
        settings.consecutive_correct_required,
      show_failed_words_in_session:
        request.show_failed_words_in_session ??
        settings.show_failed_words_in_session,
      new_words_per_day:
        request.new_words_per_day ?? settings.new_words_per_day,
      daily_review_limit:
        request.daily_review_limit ?? settings.daily_review_limit,
      auto_advance_timeout_seconds:
        request.auto_advance_timeout_seconds ??
        settings.auto_advance_timeout_seconds,
      show_hint_in_fillword:
        request.show_hint_in_fillword ?? settings.show_hint_in_fillword,
      reminder_enabled: request.reminder_enabled ?? settings.reminder_enabled,
      reminder_time: request.reminder_time ?? settings.reminder_time,
      updated_at: now(),
    };

    await db.learningSettings.put(updatedSettings);

    return updatedSettings;
  }
}
