import { Injectable, Provider } from '@angular/core';
import {
  HTTP_INTERCEPTORS,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { ApiService } from './api.service';

@Injectable()
export class OutOfSyncInterceptor implements HttpInterceptor {
  constructor(private apiService: ApiService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 500 && error.error?.data === 'OUT-OF-SYNC') {
          this.apiService.setOutOfSync();
        }
        return throwError(() => error);
      }),
    );
  }
}

export const OUT_OF_SYNC_INTERCEPTOR_PROVIDER: Provider = {
  useClass: OutOfSyncInterceptor,
  multi: true,
  provide: HTTP_INTERCEPTORS,
};
