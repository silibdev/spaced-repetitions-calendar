import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  catchError,
  defaultIfEmpty,
  forkJoin,
  map,
  MonoTypeOperatorFunction,
  Observable,
  of,
  OperatorFunction,
  shareReplay,
  tap,
  throwError
} from 'rxjs';
import { FullSettings } from '../models/settings.model';
import { ERROR_ANONYMOUS } from './auth.interceptor';
import { CommonSpacedRepModel } from '../models/spaced-rep.model';

const ApiUrls = {
  settings: '/api/settings',
  eventList: '/api/event-list',
  description: (id: string) => `/api/event-descriptions?id=${id}`,
  detail: (id: string) => `/api/event-details?id=${id}`,
  lastUpdates: '/api/last-updates'
}

const OPTS_DB_NAME = 'src-opts-db';

const DESCRIPTIONS_DB_NAME_PREFIX = 'src-desc-db';
const DESCRIPTIONS_DB_NAME = (id: string) => DESCRIPTIONS_DB_NAME_PREFIX + id;

const OLD_SHORT_DESCRIPTION_DB_NAME = 'src-short-desc-db';
const DETAIL_DB_NAME_PREFIX = 'src-event-detail-db';
const DETAIL_DB_NAME = (id: string) => DETAIL_DB_NAME_PREFIX + id;

const DB_NAME = 'src-db';

interface Extra {
  cacheKey: string,
  noCache?: boolean,
  isString?: boolean
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private static MAP_DATA<T extends { data: string }, R>(isString?: boolean): OperatorFunction<T, R> {
    return (obs) => obs.pipe(map(({data}) => (isString || !data) ? data : JSON.parse(data)));
  }

  private static HANDLE_ANONYMOUS<R>(data: R): MonoTypeOperatorFunction<R> {
    return (obs) => obs.pipe(catchError(error => {
      if (error === ERROR_ANONYMOUS) {
        return of(data);
      }
      return throwError(error);
    }))
  }

  private requestOptimizer = new Map<string, Observable<any>>();

  private pendingChangesMap = new Map<string, Observable<unknown>>();
  private pendingChanges$ = new BehaviorSubject<number>(0);

  constructor(
    private httpClient: HttpClient
  ) {
  }

  private addPendingChanges(url: string, request: any): void {
    this.pendingChangesMap.set(url, request);
    this.notifyPendingChanges();
  }

  private removePendingChanges(url: string): void {
    this.pendingChangesMap.delete(url);
    this.notifyPendingChanges();
  }

  private notifyPendingChanges(): void {
    this.pendingChanges$.next(this.pendingChangesMap.size);
  }

  private getLastUpdatesMap(): Observable<unknown> {
    return this.httpClient.get<any>(ApiUrls.lastUpdates).pipe(ApiService.MAP_DATA());
  }

  private getWithCache<R>(url: string, extra: Extra): Observable<R> {
    const cachedItem = extra.cacheKey && localStorage.getItem(extra.cacheKey);
    if (cachedItem || cachedItem === '') {
      return extra.isString ? of(cachedItem) : of(JSON.parse(cachedItem));
    }
    const cachedRequest = this.requestOptimizer.get(url);
    if (cachedRequest) {
      return cachedRequest;
    }
    const request = this.httpClient.get(url).pipe(
      tap(({data}: any) => localStorage.setItem(extra.cacheKey, data)),
      ApiService.MAP_DATA<any, R>(extra.isString),
      tap(() => this.requestOptimizer.delete(url)),
      shareReplay()
    );
    this.requestOptimizer.set(url, request)
    return request;
  }

  private postWithCache<R>(url: string, data: R, extra: Extra): Observable<R> {
    const itemToCache = extra.isString ? data as unknown as string : JSON.stringify(data);
    localStorage.setItem(extra.cacheKey, itemToCache);
    const request = this.httpClient.post(url, {data: itemToCache})
      .pipe(
        ApiService.MAP_DATA<any, R>(extra.isString),
        ApiService.HANDLE_ANONYMOUS(data)
      );
    return request.pipe(
      catchError(() => {
        this.addPendingChanges(url, request);
        return of(data);
      })
    );
  }

  private deleteWithCache<R>(url: string, extra: Extra): Observable<R> {
    if (extra.cacheKey) {
      localStorage.removeItem(extra.cacheKey);
    }
    return this.httpClient.delete(url).pipe(ApiService.MAP_DATA<any, R>());
  }

  getPendingChanges$(): Observable<number> {
    return this.pendingChanges$.asObservable();
  }

  syncPendingChanges(): Observable<number> {
    const requestMap: Observable<{ done: boolean, url: string }>[] = [];
    this.pendingChangesMap.forEach((request, url) => requestMap.push(request.pipe(
      map(() => ({done: true, url})),
      catchError(() => of({done: false, url}))
    )));
    return forkJoin(requestMap).pipe(
      defaultIfEmpty([]),
      tap(results =>
        results
          .filter(({done}) => done)
          .forEach(({url}) => {
            this.removePendingChanges(url);
          })
      ),
      map(() => this.pendingChangesMap.size)
    );
  }

  getSettings(): Observable<FullSettings | undefined> {
    return this.getWithCache<FullSettings | undefined>(ApiUrls.settings, {cacheKey: OPTS_DB_NAME})
      .pipe(ApiService.HANDLE_ANONYMOUS<FullSettings | undefined>(undefined));
  }

  setSettings(opts: FullSettings): Observable<FullSettings> {
    return this.postWithCache(ApiUrls.settings, opts, {cacheKey: OPTS_DB_NAME});
  }

  setEventList(eventListCompressed: string): Observable<string> {
    return this.postWithCache(ApiUrls.eventList, eventListCompressed, {cacheKey: DB_NAME, isString: true});
  }

  getEventList(): Observable<string | undefined> {
    return this.getWithCache<string | undefined>(ApiUrls.eventList, {cacheKey: DB_NAME, isString: true})
      .pipe(ApiService.HANDLE_ANONYMOUS<string | undefined>(undefined));
  }

  getEventDescription(id: string): Observable<string> {
    return this.getWithCache(ApiUrls.description(id), {cacheKey: DESCRIPTIONS_DB_NAME(id), isString: true});
  }

  setEventDescription(id: string, description: string): Observable<string> {
    return this.postWithCache(ApiUrls.description(id), description, {
      cacheKey: DESCRIPTIONS_DB_NAME(id),
      isString: true
    });
  }

  deleteEventDescription(id: string): Observable<string> {
    return this.deleteWithCache(ApiUrls.description(id), {cacheKey: DESCRIPTIONS_DB_NAME(id)});
  }

  getEventDetail(id: string): Observable<CommonSpacedRepModel> {
    return this.getWithCache(ApiUrls.detail(id), {cacheKey: DETAIL_DB_NAME(id)});
  }

  setEventDetail(id: string, detail: CommonSpacedRepModel): Observable<CommonSpacedRepModel> {
    return this.postWithCache(ApiUrls.detail(id), detail, {cacheKey: DETAIL_DB_NAME(id)});
  }

  deleteEventDetail(id: string): Observable<string> {
    return this.deleteWithCache(ApiUrls.detail(id), {cacheKey: DETAIL_DB_NAME(id)});
  }

  sync(): Observable<unknown> {
    // Create map of last changes
    // Ask BE to get diff
    //  -- if anonymous or network problem, continue
    //  -- it'll answer with the data that changed
    //     -- if conflicts -> show conflicts
    //     Update storage
    //     Reload everything
    return this.getLastUpdatesMap().pipe(
      catchError(error => {
        if (error === ERROR_ANONYMOUS || error.status === 404) {
          return of(undefined);
        }
        return throwError(error);
      })
    );
  }

  purgeDescriptions(ids: Set<string>) {
    const internalIds = new Set<string>();
    ids.forEach(id => {
      const internalId = DESCRIPTIONS_DB_NAME(id);
      internalIds.add(internalId);
    });

    Object.keys(localStorage).forEach(key => {
      if (key.includes(DESCRIPTIONS_DB_NAME_PREFIX) && !internalIds.has(key)) {
        localStorage.removeItem(key);
      }
      return;
    });
    return of(undefined);
  }

  purgeDetails(ids: Set<string>): Observable<unknown> {
    const internalIds = new Set<string>();
    ids.forEach(id => {
      const internalId = DESCRIPTIONS_DB_NAME(id);
      internalIds.add(internalId);
    });

    Object.keys(localStorage).forEach(key => {
      if (key.includes(OLD_SHORT_DESCRIPTION_DB_NAME)) {
        localStorage.removeItem(key)
      }
      if (key.includes(DESCRIPTIONS_DB_NAME_PREFIX) && !internalIds.has(key)) {
        localStorage.removeItem(key);
      }
      return;
    });
    return of(undefined);
  }

  getSecondMigrationEventDetail(id: string): Observable<string> {
    const internalId = OLD_SHORT_DESCRIPTION_DB_NAME + id;
    const shortDescription = localStorage.getItem(internalId)
    return of(shortDescription || '');
  }

  desync(): Observable<unknown> {
    localStorage.clear();
    return of(undefined);
  }
}
