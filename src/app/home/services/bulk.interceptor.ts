import { Injectable, Provider } from '@angular/core';
import {
  HTTP_INTERCEPTORS,
  HttpEvent,
  HttpEventType,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { bufferCount, first, map, Observable, ReplaySubject, shareReplay, Subject, switchMap, tap } from 'rxjs';

const BulkUrls = [
  `/api/event-descriptions`,
  `/api/event-details`
]

@Injectable()
export class BulkInterceptor implements HttpInterceptor {

  private bulkRequestMap = new Map<string, { emitter: Subject<any>, req: Observable<HttpEvent<unknown>> }>();

  constructor() {
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!BulkUrls.some(url => request.url.startsWith(url))) {
      return next.handle(request);
    }

    const [url, id] = request.url.split('?id=');
    const key = request.method + '-' + url;

    if (!this.bulkRequestMap.has(key)) {
      const subject = new ReplaySubject(1);
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
        emitter.next({id, data: request.body});
        break;
      default:
        emitter.next(id);
    }

    return req.pipe(map(response => {
      if (response.type !== HttpEventType.Response) {
        return response;
      }
      const body = (response.body as any)?.data[id];
      return response.clone({
        body
      });
    }));
  }
}

export const BULK_INTERCEPTOR_PROVIDER: Provider = {
  useClass: BulkInterceptor,
  multi: true,
  provide: HTTP_INTERCEPTORS
}
