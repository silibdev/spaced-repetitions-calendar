import { Injectable, Provider } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor, HTTP_INTERCEPTORS, HttpResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const ERROR_ANONYMOUS = 'error-anonymous';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService
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
      return next.handle(request);
    }
    return throwError(() => ERROR_ANONYMOUS);
  }
}

export const AUTH_INTERCEPTOR_PROVIDER: Provider = {
  useClass: AuthInterceptor,
  multi: true,
  provide: HTTP_INTERCEPTORS
}
