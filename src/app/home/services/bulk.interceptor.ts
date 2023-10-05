import { Injectable, Provider } from '@angular/core';
import {
  HTTP_INTERCEPTORS,
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import {
  bufferCount,
  catchError,
  first,
  map,
  Observable,
  ReplaySubject,
  shareReplay,
  Subject,
  switchMap,
  tap,
  throwError
} from 'rxjs';

const BulkUrls = [
  { url: `/api/event-descriptions`},
  { url: `/api/event-details`},
  {
    url: `/api/qnas`, methods: ['GET']
  }
];

type BulkBody = {
  queryParams: string,
  body?: any
}

@Injectable()
export class BulkInterceptor implements HttpInterceptor {

  private bulkRequestMap = new Map<string, { emitter: Subject<BulkBody>, req: Observable<HttpEvent<unknown>> }>();

  constructor() {
  }

  private checkIfBulk(urlToCheck: string, methodToCheck: string): boolean {
    return BulkUrls.some(urlOpt => {
      const url = urlOpt.url;
      const methods = urlOpt.methods || ['GET', 'POST'];
      return urlToCheck.startsWith(url) && methods.includes(methodToCheck);
    });
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.checkIfBulk(request.url, request.method)) {
      return next.handle(request);
    }

    const [url, queryParams] = request.url.split('?');
    const key = request.method + '-' + url;

    if (!this.bulkRequestMap.has(key)) {
      const subject = new ReplaySubject<BulkBody>(1);
      let timeout: any;
      const clearSubject = () => {
        subject.complete();
        this.bulkRequestMap.delete(key);
      };
      const newReqObs = subject.pipe(
        tap(() => {
          if (timeout) {
            clearTimeout(timeout);
          }
          timeout = setTimeout(clearSubject, 250);
        }),
        bufferCount(100),
        first(),
        tap({
          complete: () => {
            clearSubject();
            if (timeout) {
              clearTimeout(timeout)
            }
          }
        }),
        switchMap(data => {
          const bulkRequest = new HttpRequest(
            'POST',
            url + '/?bulk',
            {data, method: request.method}
          );
          return next.handle(bulkRequest);
        }),
        shareReplay()
      );
      this.bulkRequestMap.set(key, {
        emitter: subject,
        req: newReqObs
      });
    }

    const {emitter, req} = this.bulkRequestMap.get(key)!;

    switch (request.method) {
      case 'POST':
      case 'PUT':
        emitter.next({queryParams, body: request.body});
        break;
      default:
        emitter.next({queryParams});
    }

    return req.pipe(
      map(response => {
        if (response.type !== HttpEventType.Response) {
          return response;
        }
        const body = (response.body as any)?.data[queryParams] || {data: undefined, updatedAt: ''};
        return response.clone({
          body
        });
      }),
      catchError((error: HttpErrorResponse) => {
        const data = error.error.data[queryParams];
        return throwError(() => new HttpErrorResponse({
            error: data,
            headers: error.headers,
            status: error.status,
            statusText: error.statusText,
            url: error.url || request.urlWithParams || undefined
          })
        );
      })
    );
  }
}

export const BULK_INTERCEPTOR_PROVIDER: Provider = {
  useClass: BulkInterceptor,
  multi: true,
  provide: HTTP_INTERCEPTORS
}
