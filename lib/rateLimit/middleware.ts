const rateLimitMap = new Map<
  string,
  { count: number; resetAt: number }
>();

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, key) => {
    if (entry.resetAt < now) rateLimitMap.delete(key);
  });
}, 60000);

export function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return true; // allowed
  }

  if (entry.count >= maxRequests) return false; // blocked

  entry.count++;
  return true; // allowed
}

export function rateLimitResponse() {
  return Response.json(
    { error: "rate_limit_exceeded", message: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": "30" } }
  );
}
