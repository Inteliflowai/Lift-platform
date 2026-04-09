import { logError } from "@/lib/errors/handler";

/**
 * Wrap non-critical DB operations so failures are logged but never surface to users.
 */
export async function withDb<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(error, { context: "database" });
    return fallback;
  }
}
