export class AppError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export function notFound(message = "Resource not found") {
  return new AppError(404, message);
}

export function forbidden(message = "You do not have permission to perform this action") {
  return new AppError(403, message);
}

export function badRequest(message = "Invalid request", details = undefined) {
  return new AppError(400, message, details);
}

export function unauthorized(message = "Authentication required") {
  return new AppError(401, message);
}
