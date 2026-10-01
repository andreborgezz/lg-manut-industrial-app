export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Registro duplicado ou em conflito') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Erro de validação nos dados fornecidos') {
    super(message, 400);
  }
}
