import { Injectable, Provider } from '@angular/core';
import {
  HTTP_INTERCEPTORS,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

export const ERROR_ANONYMOUS = 'error-anonymous';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private apiService: ApiService
  ) {
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!request.url.startsWith('/api')) {
      return next.handle(request);
    }
    const token = this.authService.getUser()?.token;
    if (token) {
      const headers = request.headers.append('Authorization', 'Bearer ' + token);
      request = request.clone({headers});
      return next.handle(request).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 500 && error.error?.data === 'OUT-OF-SYNC') {
            this.apiService.setOutOfSync();
          }
          return throwError(() => error);
        })
      );
    }
    return throwError(() => ERROR_ANONYMOUS);
  }
}

export const AUTH_INTERCEPTOR_PROVIDER: Provider = {
  useClass: AuthInterceptor,
  multi: true,
  provide: HTTP_INTERCEPTORS
}
