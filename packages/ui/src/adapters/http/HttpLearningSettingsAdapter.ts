/**
 * HTTP Learning Settings Adapter
 * Communicates with desktop SQLite backend via HTTP REST API
 */

import { HttpAdapter } from "./HttpAdapter";
import type {
  ILearningSettingsService,
  UpdateLearningSettingsRequest,
} from "@cham-lang/shared/services";
import type { LearningSettings } from "@cham-lang/shared/types";

export class HttpLearningSettingsAdapter
  extends HttpAdapter
  implements ILearningSettingsService
{
  async getLearningSettings(): Promise<LearningSettings | null> {
    return this.get<LearningSettings | null>("/learning/settings");
  }

  async getOrCreateLearningSettings(): Promise<LearningSettings> {
    return this.get<LearningSettings>("/learning/settings/or-create");
  }

  async updateLearningSettings(
    request: UpdateLearningSettingsRequest,
  ): Promise<LearningSettings> {
    return this.put<LearningSettings>("/learning/settings", request);
  }
}
