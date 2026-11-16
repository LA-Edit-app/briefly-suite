/**
 * The message of a caught value, or "" when there isn't one.
 * Supabase errors are plain objects with a `message`, not always `Error`s.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message === "string") return message;
  }
  return "";
}
