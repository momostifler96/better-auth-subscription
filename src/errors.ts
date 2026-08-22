/**
 * Erreurs spécifiques au domaine avec codes HTTP appropriés.
 * Chaque erreur inclut un code HTTP qui sera utilisé dans la réponse.
 */

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_INPUT"
  | "ALREADY_EXISTS"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "QUOTA_EXCEEDED";

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Classe d'erreur personnalisée avec code HTTP.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = "AppError";
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Erreur: ressource non trouvée (404).
 */
export class NotFoundError extends AppError {
  constructor(resourceType: string, identifier: string | number) {
    super(
      "NOT_FOUND",
      `${resourceType} with identifier "${identifier}" not found`,
      404,
      { resourceType, identifier },
    );
    this.name = "NotFoundError";
  }
}

/**
 * Erreur: ressource existe déjà (409).
 */
export class AlreadyExistsError extends AppError {
  constructor(resourceType: string, field: string, value: string) {
    super(
      "CONFLICT",
      `${resourceType} with ${field} "${value}" already exists`,
      409,
      { resourceType, field, value },
    );
    this.name = "AlreadyExistsError";
  }
}

/**
 * Erreur: données invalides (400).
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

/**
 * Erreur: mauvais format d'entrée (400).
 */
export class InvalidInputError extends AppError {
  constructor(field: string, reason: string) {
    super(
      "INVALID_INPUT",
      `Invalid input for field "${field}": ${reason}`,
      400,
      { field, reason },
    );
    this.name = "InvalidInputError";
  }
}

/**
 * Erreur: accès refusé (403).
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

/**
 * Erreur: non authentifié (401).
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * Erreur: quota dépassé (429).
 */
export class QuotaExceededError extends AppError {
  constructor(resource: string, limit: number) {
    super(
      "QUOTA_EXCEEDED",
      `${resource} quota exceeded (limit: ${limit})`,
      429,
      { resource, limit },
    );
    this.name = "QuotaExceededError";
  }
}

/**
 * Erreur: requête malformée (400).
 */
export class BadRequestError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("BAD_REQUEST", message, 400, details);
    this.name = "BadRequestError";
  }
}

/**
 * Utilitaire pour vérifier si une erreur est une AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Utilitaire pour obtenir les détails d'erreur à retourner au client.
 */
export function getErrorResponse(error: unknown) {
  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && { details: error.details }),
        },
      },
    };
  }

  // Erreur inconnue
  return {
    statusCode: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      },
    },
  };
}
