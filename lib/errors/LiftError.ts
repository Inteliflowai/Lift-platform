export class LiftError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "LiftError";
  }
}

export class AIProviderError extends LiftError {
  constructor(
    provider: "anthropic" | "openai",
    message: string,
    context?: Record<string, unknown>
  ) {
    super(`AI_PROVIDER_ERROR_${provider.toUpperCase()}`, message, context);
    this.name = "AIProviderError";
  }
}

export class SessionError extends LiftError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("SESSION_ERROR", message, context);
    this.name = "SessionError";
  }
}

export class ValidationError extends LiftError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, context);
    this.name = "ValidationError";
  }
}

export class TenantError extends LiftError {
  constructor(message: string, context?: Record<string, unknown>) {
    super("TENANT_ERROR", message, context);
    this.name = "TenantError";
  }
}
