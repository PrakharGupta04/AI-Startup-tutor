import { AiError } from "./errors";

export function requireText(
  value: string,
  max: number,
  optional = false
): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    if (!optional) {
      throw new AiError("INVALID_INPUT");
    }
    return "";
  }

  if (trimmed.length > max) {
    throw new AiError("INVALID_INPUT");
  }

  return trimmed;
}
