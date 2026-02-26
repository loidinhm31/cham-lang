import { logger } from "@cham-lang/shared";

/**
 * Domain-specific logger wrappers for consistent logging across services
 */
export const serviceLogger = {
  /**
   * Log HTTP-related messages
   */
  http: (msg: string, ...args: unknown[]) => logger.info("HTTP", msg, ...args),
  httpError: (msg: string, ...args: unknown[]) =>
    logger.error("HTTP", msg, ...args),
  httpDebug: (msg: string, ...args: unknown[]) =>
    logger.debug("HTTP", msg, ...args),

  /**
   * Log Tauri IPC messages
   */
  tauri: (msg: string, ...args: unknown[]) =>
    logger.info("Tauri IPC", msg, ...args),
  tauriError: (msg: string, ...args: unknown[]) =>
    logger.error("Tauri IPC", msg, ...args),
  tauriDebug: (msg: string, ...args: unknown[]) =>
    logger.debug("Tauri IPC", msg, ...args),

  /**
   * Log authentication-related messages
   */
  auth: (msg: string, ...args: unknown[]) => logger.info("Auth", msg, ...args),
  authError: (msg: string, ...args: unknown[]) =>
    logger.error("Auth", msg, ...args),
  authDebug: (msg: string, ...args: unknown[]) =>
    logger.debug("Auth", msg, ...args),

  /**
   * Log service factory messages
   */
  factory: (msg: string, ...args: unknown[]) =>
    logger.info("ServiceFactory", msg, ...args),
  factoryError: (msg: string, ...args: unknown[]) =>
    logger.error("ServiceFactory", msg, ...args),
  factoryDebug: (msg: string, ...args: unknown[]) =>
    logger.debug("ServiceFactory", msg, ...args),

  /**
   * Log QM server messages
   */
  qmServer: (msg: string, ...args: unknown[]) =>
    logger.info("QmServer", msg, ...args),
  qmServerError: (msg: string, ...args: unknown[]) =>
    logger.error("QmServer", msg, ...args),
  qmServerDebug: (msg: string, ...args: unknown[]) =>
    logger.debug("QmServer", msg, ...args),

  /**
   * Log sync adapter messages
   */
  sync: (msg: string, ...args: unknown[]) => logger.info("Sync", msg, ...args),
  syncError: (msg: string, ...args: unknown[]) =>
    logger.error("Sync", msg, ...args),
  syncDebug: (msg: string, ...args: unknown[]) =>
    logger.debug("Sync", msg, ...args),

  /**
   * Log vocabulary-related messages
   */
  vocab: (msg: string, ...args: unknown[]) =>
    logger.info("Vocabulary", msg, ...args),
  vocabError: (msg: string, ...args: unknown[]) =>
    logger.error("Vocabulary", msg, ...args),
  vocabDebug: (msg: string, ...args: unknown[]) =>
    logger.debug("Vocabulary", msg, ...args),

  /**
   * Log collection-related messages
   */
  collection: (msg: string, ...args: unknown[]) =>
    logger.info("Collection", msg, ...args),
  collectionError: (msg: string, ...args: unknown[]) =>
    logger.error("Collection", msg, ...args),
  collectionDebug: (msg: string, ...args: unknown[]) =>
    logger.debug("Collection", msg, ...args),

  /**
   * Log practice-related messages
   */
  practice: (msg: string, ...args: unknown[]) =>
    logger.info("Practice", msg, ...args),
  practiceError: (msg: string, ...args: unknown[]) =>
    logger.error("Practice", msg, ...args),
  practiceDebug: (msg: string, ...args: unknown[]) =>
    logger.debug("Practice", msg, ...args),

  /**
   * Log Google Drive messages
   */
  gdrive: (msg: string, ...args: unknown[]) =>
    logger.info("GDrive", msg, ...args),
  gdriveError: (msg: string, ...args: unknown[]) =>
    logger.error("GDrive", msg, ...args),
  gdriveDebug: (msg: string, ...args: unknown[]) =>
    logger.debug("GDrive", msg, ...args),

  /**
   * Log notification-related messages
   */
  notification: (msg: string, ...args: unknown[]) =>
    logger.info("Notification", msg, ...args),
  notificationError: (msg: string, ...args: unknown[]) =>
    logger.error("Notification", msg, ...args),
  notificationDebug: (msg: string, ...args: unknown[]) =>
    logger.debug("Notification", msg, ...args),
};
