import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Info, Save } from "lucide-react";
import { TopBar } from "@/components/molecules";
import { Button, Card, Select } from "@/components/atoms";
import { LearningSettingsService } from "@/services/learningSettings.service";
import { useDialog } from "@/contexts";
import type {
  LeitnerBoxCount,
  SpacedRepetitionAlgorithm,
} from "@/types/settings";
import { BOX_INTERVAL_PRESETS } from "@/types/settings";

export const LearningSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showAlert } = useDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [algorithm, setAlgorithm] =
    useState<SpacedRepetitionAlgorithm>("modifiedsm2");
  const [boxCount, setBoxCount] = useState<LeitnerBoxCount>(5);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(3);
  const [showFailedWords, setShowFailedWords] = useState(true);
  const [newWordsPerDay, setNewWordsPerDay] = useState(20);
  const [dailyReviewLimit, setDailyReviewLimit] = useState(100);
  const [autoAdvanceTimeout, setAutoAdvanceTimeout] = useState(2);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await LearningSettingsService.getOrCreateLearningSettings();

      // Update form state
      setAlgorithm(data.sr_algorithm);
      setBoxCount(data.leitner_box_count as LeitnerBoxCount);
      setConsecutiveCorrect(data.consecutive_correct_required);
      setShowFailedWords(data.show_failed_words_in_session);
      setNewWordsPerDay(data.new_words_per_day || 20);
      setDailyReviewLimit(data.daily_review_limit || 100);
      setAutoAdvanceTimeout(data.auto_advance_timeout_seconds);
      setShowHint(data.show_hint_in_fillword);
    } catch (error) {
      console.error("Failed to load settings:", error);
      showAlert(t("messages.error"), { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await LearningSettingsService.updateLearningSettings({
        sr_algorithm: algorithm,
        leitner_box_count: boxCount,
        consecutive_correct_required: consecutiveCorrect,
        show_failed_words_in_session: showFailedWords,
        new_words_per_day: newWordsPerDay,
        daily_review_limit: dailyReviewLimit,
        auto_advance_timeout_seconds: autoAdvanceTimeout,
        show_hint_in_fillword: showHint,
      });
      showAlert(t("settings.saved") || "Settings saved successfully!", {
        variant: "success",
      });
      navigate(-1);
    } catch (error) {
      console.error("Failed to save settings:", error);
      showAlert(t("messages.error"), { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const algorithmOptions = [
    {
      value: "sm2",
      label: "SM-2 (Advanced)",
    },
    {
      value: "modifiedsm2",
      label: "Modified SM-2 (Recommended)",
    },
    {
      value: "simple",
      label: "Simple Doubling (Beginner)",
    },
  ];

  const boxCountOptions = [
    { value: "3", label: "3 Boxes (Simple)" },
    { value: "5", label: "5 Boxes (Balanced)" },
    { value: "7", label: "7 Boxes (Advanced)" },
  ];

  const getIntervalPreview = () => {
    const intervals = BOX_INTERVAL_PRESETS[boxCount];
    return intervals.map((days, index) => (
      <div key={index} className="flex justify-between text-sm">
        <span className="text-gray-600">Box {index + 1}:</span>
        <span className="font-semibold text-gray-800">
          {days} {days === 1 ? "day" : "days"}
        </span>
      </div>
    ));
  };

  if (loading) {
    return (
      <>
        <TopBar
          title={t("settings.learning") || "Learning Settings"}
          showBack
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">{t("app.loading")}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={t("settings.learning") || "Learning Settings"} showBack />

      <div className="px-4 pt-6 space-y-6 pb-20">
        {/* Header */}
        <div className="text-center py-4">
          <div className="text-5xl mb-3">⚙️</div>
          <h1 className="text-3xl font-black text-gray-800 mb-2">
            {t("settings.learningTitle") || "Spaced Repetition Settings"}
          </h1>
          <p className="text-gray-600">
            {t("settings.learningDescription") ||
              "Customize how you learn vocabulary"}
          </p>
        </div>

        {/* Algorithm Selection */}
        <Card variant="glass">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              {t("settings.algorithm") || "Learning Algorithm"}
            </label>
            <Select
              options={algorithmOptions}
              value={algorithm}
              onChange={(e) =>
                setAlgorithm(e.target.value as SpacedRepetitionAlgorithm)
              }
            />
            <div className="flex gap-2 p-3 bg-blue-50 rounded-xl">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">
                {algorithm === "sm2" &&
                  (t("settings.sm2Description") ||
                    "Dynamic intervals based on performance. Best for advanced learners.")}
                {algorithm === "modifiedsm2" &&
                  (t("settings.modifiedSm2Description") ||
                    "Fixed intervals per box. Predictable and easy to understand.")}
                {algorithm === "simple" &&
                  (t("settings.simpleDescription") ||
                    "Doubles interval each time. Great for beginners.")}
              </p>
            </div>
          </div>
        </Card>

        {/* Box Count Selection */}
        <Card variant="glass">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              {t("settings.boxCount") || "Number of Leitner Boxes"}
            </label>
            <Select
              options={boxCountOptions}
              value={String(boxCount)}
              onChange={(e) =>
                setBoxCount(Number(e.target.value) as LeitnerBoxCount)
              }
            />
            <div className="p-3 bg-gray-50 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase">
                {t("settings.intervalPreview") || "Interval Preview"}
              </p>
              {getIntervalPreview()}
            </div>
          </div>
        </Card>

        {/* Consecutive Correct Requirement */}
        <Card variant="glass">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              {t("settings.consecutiveCorrect") ||
                "Consecutive Correct to Advance"}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={consecutiveCorrect}
              onChange={(e) => setConsecutiveCorrect(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center">
              <span className="text-3xl font-black text-teal-600">
                {consecutiveCorrect}
              </span>
              <span className="text-sm text-gray-600 ml-2">
                {t("settings.times") || "times"}
              </span>
            </div>
            <p className="text-xs text-gray-600 text-center">
              {t("settings.consecutiveCorrectDescription") ||
                "How many correct answers needed to move to next box"}
            </p>
          </div>
        </Card>

        {/* Daily Limits */}
        <Card variant="glass">
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                {t("settings.newWordsPerDay") || "New Words Per Day"}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={newWordsPerDay}
                onChange={(e) => setNewWordsPerDay(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white/60 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                {t("settings.dailyReviewLimit") || "Daily Review Limit"}
              </label>
              <input
                type="number"
                min="10"
                max="500"
                value={dailyReviewLimit}
                onChange={(e) => setDailyReviewLimit(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white/60 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </Card>

        {/* Failed Words Option */}
        <Card variant="glass">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t("settings.showFailedWords") ||
                  "Show Failed Words in Session"}
              </label>
              <p className="text-xs text-gray-600">
                {t("settings.showFailedWordsDescription") ||
                  "Retry incorrect words immediately in the same session"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFailedWords(!showFailedWords)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                showFailedWords ? "bg-teal-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  showFailedWords ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </Card>

        {/* UI Preferences Section */}
        <div className="pt-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {t("settings.uiPreferences") || "UI Preferences"}
          </h2>
        </div>

        {/* Auto-Advance Timeout */}
        <Card variant="glass">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              {t("settings.autoAdvanceTimeout") || "Auto-Advance Timeout"}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={autoAdvanceTimeout}
              onChange={(e) => setAutoAdvanceTimeout(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center">
              <span className="text-3xl font-black text-teal-600">
                {autoAdvanceTimeout}
              </span>
              <span className="text-sm text-gray-600 ml-2">
                {t("settings.seconds") || "seconds"}
              </span>
            </div>
            <p className="text-xs text-gray-600 text-center">
              {t("settings.autoAdvanceTimeoutDescription") ||
                "Time before automatically showing next question"}
            </p>
          </div>
        </Card>

        {/* Show Hint in Fill Word */}
        <Card variant="glass">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t("settings.showHintInFillWord") ||
                  "Show Hint in Fill Word Mode"}
              </label>
              <p className="text-xs text-gray-600">
                {t("settings.showHintInFillWordDescription") ||
                  "Display the first letter as a hint when filling words"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                showHint ? "bg-teal-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  showHint ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            {t("buttons.cancel")}
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon={Save}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t("buttons.saving") || "Saving..." : t("buttons.save")}
          </Button>
        </div>
      </div>
    </>
  );
};
