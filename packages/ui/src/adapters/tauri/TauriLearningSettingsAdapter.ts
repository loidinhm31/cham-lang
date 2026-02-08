/**
 * Tauri Learning Settings Adapter
 * Wraps Tauri IPC calls for learning settings operations
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  ILearningSettingsService,
  UpdateLearningSettingsRequest,
} from "@cham-lang/ui/adapters/factory/interfaces";
import type { LearningSettings } from "@cham-lang/shared/types";

export class TauriLearningSettingsAdapter implements ILearningSettingsService {
  async getLearningSettings(): Promise<LearningSettings | null> {
    return invoke("get_learning_settings");
  }

  async getOrCreateLearningSettings(): Promise<LearningSettings> {
    return invoke("get_or_create_learning_settings");
  }

  async updateLearningSettings(
    request: UpdateLearningSettingsRequest,
  ): Promise<LearningSettings> {
    return invoke("update_learning_settings", { request });
  }
}
