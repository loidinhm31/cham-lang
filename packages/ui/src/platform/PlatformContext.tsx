import React, { createContext, useContext } from "react";
import type {
  IVocabularyService,
  ICollectionService,
  IPracticeService,
  ILearningSettingsService,
  INotificationService,
  ICSVService,
  IGDriveService,
  ISyncService,
  IAuthService,
} from "@cham-lang/ui/adapters/factory/interfaces";

/**
 * Platform services interface for dependency injection
 * Different platforms (Tauri, Web, HTTP) provide different implementations
 */
export interface IPlatformServices {
  vocabulary: IVocabularyService;
  collection: ICollectionService;
  practice: IPracticeService;
  learningSettings: ILearningSettingsService;
  notification: INotificationService;
  csv: ICSVService;
  gdrive: IGDriveService;
  sync: ISyncService;
  auth: IAuthService;
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
