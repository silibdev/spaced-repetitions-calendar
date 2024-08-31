import { Injectable, Provider } from '@angular/core';
import {
  HTTP_INTERCEPTORS,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { finalize, Observable } from 'rxjs';
import { LoaderService } from './loader.service';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  constructor(private loaderService: LoaderService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    this.loaderService.startLoading();
    return next
      .handle(request)
      .pipe(finalize(() => this.loaderService.stopLoading()));
  }
}

export const LOADER_INTERCEPTOR_PROVIDER: Provider = {
  useClass: LoaderInterceptor,
  multi: true,
  provide: HTTP_INTERCEPTORS,
};
