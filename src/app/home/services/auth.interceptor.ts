import { Injectable, Provider } from '@angular/core';
import {
  HTTP_INTERCEPTORS,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { catchError, Observable, of, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const ERROR_ANONYMOUS = 'error-anonymous';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    if (!request.url.startsWith('/api')) {
      return next.handle(request);
    }
    const token = this.authService.getUser()?.token;
    if (token) {
      return this.authService.getToken$().pipe(
        catchError((error: HttpErrorResponse) => {
          // If no connection, return expired token, it's ok
          if ([504, 0].includes(error.status)) {
            return of(token);
          }
          return throwError(() => error);
        }),
        switchMap((refreshedToken) => {
          const headers = request.headers.append(
            'Authorization',
            'Bearer ' + refreshedToken,
          );
          request = request.clone({ headers });
          return next.handle(request);
        }),
      );
    }
    return throwError(() => ERROR_ANONYMOUS);
  }
}

export const AUTH_INTERCEPTOR_PROVIDER: Provider = {
  useClass: AuthInterceptor,
  multi: true,
  provide: HTTP_INTERCEPTORS,
};
