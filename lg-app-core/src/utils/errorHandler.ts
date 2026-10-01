import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Erros de validação do Zod
  if (err instanceof ZodError) {
    const detalhes = err.issues.map((e: any) => ({
      campo: e.path.join('.'),
      mensagem: e.message,
    }));
    res.status(400).json({
      message: 'Erro de validação nos campos',
      errors: detalhes,
    });
    return;
  }

  // 2. Erros customizados da aplicação
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
    });
    return;
  }

  // 3. Códigos específicos do PostgreSQL
  if (err && typeof err.code === 'string') {
    // 23503: foreign_key_violation
    if (err.code === '23503') {
      res.status(400).json({
        message: 'Registro referenciado não existe ou está em uso (violação de chave estrangeira)',
        detail: err.detail,
      });
      return;
    }

    // 23505: unique_violation
    if (err.code === '23505') {
      res.status(409).json({
        message: 'Já existe um registro com os dados informados (violação de chave única)',
        detail: err.detail,
      });
      return;
    }

    // 23514: check_violation (ex: status inválido do orçamento)
    if (err.code === '23514') {
      res.status(400).json({
        message: 'Dados informados violam as regras do banco de dados',
        detail: err.detail,
      });
      return;
    }

    // 22P02: invalid_text_representation (ex: sintaxe inválida de número/uuid)
    if (err.code === '22P02') {
      res.status(400).json({
        message: 'Formato de dado inválido para o banco de dados',
      });
      return;
    }
  }

  // 4. Demais erros não tratados (500)
  console.error('❌ Erro não tratado no servidor:', err);
  res.status(500).json({
    message: 'Erro interno no servidor',
  });
};
