/**
 * True once sql/phase4-orbit-shares.sql is approved AND applied to the live
 * database. Until then share counts are not queried (avoids 404s) and the
 * share flow skips its bookkeeping insert — shares still deliver via chat.
 * Flip to true immediately after applying the migration.
 */
export const ORBIT_SHARES_TRACKED = false;

export const ORBIT_PAGE_SIZE = 20;
export const ORBIT_COMMENT_PAGE_SIZE = 25;
export const ORBIT_MAX_POST_LENGTH = 5000;
export const ORBIT_MAX_COMMENT_LENGTH = 1000;
export const ORBIT_MAX_IMAGES = 10;
export const ORBIT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ORBIT_REPORT_REASONS = ["spam", "harassment", "inappropriate", "misinformation", "other"] as const;
