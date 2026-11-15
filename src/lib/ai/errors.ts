export type AiErrorCode =
  | "NOT_CONFIGURED"
  | "CONFIG_ERROR"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "EMPTY"
  | "BLOCKED"
  | "MALFORMED"
  | "INVALID_INPUT";

export const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  NOT_CONFIGURED:
    "AI is not configured. Ask your instructor to add a Gemini API key.",
  CONFIG_ERROR:
    "The AI provider rejected the request settings (API key or model name). Ask your instructor to check the AI configuration.",
  RATE_LIMITED:
    "The free AI limit has been reached. Please wait a few minutes and try again. If it keeps happening, the daily limit may be used up.",
  TIMEOUT: "The AI took too long to respond. Please try again.",
  UNAVAILABLE:
    "The AI service is temporarily unavailable. Please try again later.",
  EMPTY: "The AI returned an empty response. Please try again.",
  BLOCKED: "The AI declined to answer this request. Try rewording it.",
  MALFORMED: "The AI returned an unreadable response. Please try again.",
  INVALID_INPUT: "The text is empty or too long for the AI.",
};

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly status?: number;

  constructor(code: AiErrorCode, options?: { status?: number }) {
    super(AI_ERROR_MESSAGES[code]);
    this.name = "AiError";
    this.code = code;
    this.status = options?.status;
  }
}

export function isAiError(e: unknown): e is AiError {
  return e instanceof AiError;
}
