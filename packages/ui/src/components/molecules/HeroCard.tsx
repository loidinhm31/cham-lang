import React from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@cham-lang/ui/components/atoms";
import chameleonIcon from "../../assets/chameleon.svg";

export const HeroCard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card variant="default" className="overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
        {/* Logo */}
        <div className="flex-shrink-0">
          <div className="w-32 h-32 btn-hero rounded-[32px] border-[4px] border-purple-600 shadow-[0_10px_0_rgba(0,0,0,0.15),0_5px_15px_rgba(0,0,0,0.12)] flex items-center justify-center transform hover:rotate-3 transition-transform duration-300">
            <img src={chameleonIcon} alt="Cham Lang" className="w-20 h-20" />
          </div>
        </div>

        {/* Title and Tagline */}
        <div className="text-center lg:text-left flex-grow">
          <h1 className="text-5xl lg:text-6xl font-black text-(--color-text-primary) mb-3 tracking-tight">
            {t("app.name").toUpperCase()}
          </h1>
          <p className="text-xl lg:text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
            {t("app.tagline")}
          </p>
        </div>
      </div>
    </Card>
  );
};
