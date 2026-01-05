import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brain, Plus } from "lucide-react";
import { Card, Button } from "@/components/atoms";

export const QuickActionsCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card variant="clay-lilac">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{t("nav.learn")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          variant="secondary"
          size="lg"
          icon={Brain}
          onClick={() => navigate("/practice")}
          className="h-20 flex-col gap-2"
        >
          {t("practice.title")}
        </Button>
        <Button
          variant="primary"
          size="lg"
          icon={Plus}
          onClick={() => navigate("/vocabulary/add")}
          className="h-20 flex-col gap-2"
        >
          {t("vocabulary.add")}
        </Button>
      </div>
    </Card>
  );
};
