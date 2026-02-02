import React, { createContext, useContext } from "react";
import type { IVocabularyService } from "@cham-lang/shared/services";
import type { ICollectionService } from "@cham-lang/shared/services";
import type { IPracticeService } from "@cham-lang/shared/services";
import type { ILearningSettingsService } from "@cham-lang/shared/services";
import type { INotificationService } from "@cham-lang/shared/services";
import type { ICSVService } from "@cham-lang/shared/services";
import type { IGDriveService } from "@cham-lang/shared/services";

export interface IPlatformServices {
  vocabulary: IVocabularyService;
  collection: ICollectionService;
  practice: IPracticeService;
  learningSettings: ILearningSettingsService;
  notification: INotificationService;
  csv: ICSVService;
  gdrive: IGDriveService;
}

export interface PlatformProviderProps {
  services: IPlatformServices;
  children: React.ReactNode;
}

export const PlatformContext = createContext<IPlatformServices | null>(null);

export const usePlatformServices = (): IPlatformServices => {
  const services = useContext(PlatformContext);
  if (!services) {
    throw new Error(
      "usePlatformServices must be used within a PlatformProvider",
    );
  }
  return services;
};

export const PlatformProvider: React.FC<PlatformProviderProps> = ({
  services,
  children,
}) => (
  <PlatformContext.Provider value={services}>
    {children}
  </PlatformContext.Provider>
);
