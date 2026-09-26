export const CHAT_CONSTANTS = {
  SEARCH_DEBOUNCE_MS: 300,
  DISCOVER_PAGE_SIZE: 20,
  REQUEST_MESSAGE_MAX_LENGTH: 2000,
};

export const CHAT_REQUEST_ACTIONS = {
  ACCEPT: "accept",
  DECLINE: "decline",
} as const;

export type ChatRequestAction =
  (typeof CHAT_REQUEST_ACTIONS)[keyof typeof CHAT_REQUEST_ACTIONS];
