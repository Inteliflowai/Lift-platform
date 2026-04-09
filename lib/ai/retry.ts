import { isRetryable } from "@/lib/errors/handler";

interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
  retryOn?: number[];
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffFactor: 2,
  retryOn: [429, 500, 502, 503, 504],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLast = attempt === opts.maxAttempts;

      if (isLast || !isRetryable(error)) {
        throw error;
      }

      // Check for Retry-After header in rate limit errors
      let waitMs = opts.delayMs * Math.pow(opts.backoffFactor, attempt - 1);

      if (error instanceof Error && error.message.includes("429")) {
        // Rate limited — wait longer
        waitMs = Math.max(waitMs, 5000);
      }

      console.warn(
        `[Retry] Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${waitMs}ms...`,
        error instanceof Error ? error.message : error
      );

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error("withRetry exhausted all attempts");
}
