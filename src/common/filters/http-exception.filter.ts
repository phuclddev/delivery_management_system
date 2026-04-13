import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const normalized = this.normalizeExceptionResponse(exceptionResponse);

    const message =
      normalized.message ??
      (isHttpException ? 'Request failed.' : 'Internal server error.');
    const stack = exception instanceof Error ? exception.stack : undefined;
    const requestLabel = `${request.method} ${request.url}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unhandled error on ${requestLabel}: ${message}`,
        stack,
      );
    } else {
      this.logger.warn(
        `Request failed on ${requestLabel} with status ${status}: ${message}`,
      );
    }

    response.status(status).json({
      success: false,
      message,
      error: normalized.error ?? HttpStatus[status] ?? 'Error',
      details: normalized.details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private normalizeExceptionResponse(
    response: string | object | null,
  ): {
    message?: string;
    error?: string;
    details?: unknown;
  } {
    if (typeof response === 'string') {
      return {
        message: response,
      };
    }

    if (response && typeof response === 'object') {
      const candidate = response as {
        message?: string | string[];
        error?: string;
      };

      if (Array.isArray(candidate.message)) {
        return {
          message: 'Validation failed.',
          error: candidate.error,
          details: candidate.message,
        };
      }

      return {
        message: candidate.message,
        error: candidate.error,
      };
    }

    return {};
  }
}
