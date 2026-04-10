import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../interfaces/api-success-response.interface';

interface ResponseBody<T> {
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T | ResponseBody<T>, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T | ResponseBody<T>>,
  ): Observable<ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<{ url: string }>();

    return next.handle().pipe(
      map((body) => {
        const normalized =
          this.isResponseBody(body) && 'data' in body
            ? body
            : {
                data: body as T,
              };

        return {
          success: true as const,
          message: normalized.message ?? 'Request completed successfully.',
          data: normalized.data as T,
          ...(normalized.meta ? { meta: normalized.meta } : {}),
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }

  private isResponseBody(value: unknown): value is ResponseBody<T> {
    return typeof value === 'object' && value !== null;
  }
}

