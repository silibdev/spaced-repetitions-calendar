import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
  switchMap,
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

const LAST_UPDATE_DB_NAME = 'src-last-update-db';

const DB_NAME = 'src-db';

interface Extra {
  cacheKey: string,
  noCache?: boolean,
  dontParse?: boolean
}

type LastUpdateOp = 'U' | 'R' | 'none'

interface LastUpdateRemote {
  eventList: string;
  eventDescriptions: {id: string, updatedAt: string}[];
  eventDetails: {id: string, updatedAt: string}[];
  settings: string;
}

type LastUpdate = Record<string, string>; // cacheKey - iso_string

function isAfter(dateA?: string, dateB?: string): boolean {
  if (!dateA || !dateB) {
    return true;
  }
  return new Date(dateA) > new Date(dateB);
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private outOfSync$ = new BehaviorSubject(false);
  private MAP_DATA<T extends { data: string, updatedAt?: string }, R>(cacheKey: string, extra: {dontParse?: boolean, lastUpdateOp: LastUpdateOp }): OperatorFunction<T, R> {
    return (obs) => obs.pipe(
      map(({data, updatedAt}) => {
        if (updatedAt) {
          this.saveLastUpdateMap(cacheKey, updatedAt, extra.lastUpdateOp);
        }
        return (extra.dontParse || !data) ? data : JSON.parse(data)
      })
    );
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

  private lastUpdateMap: LastUpdate = {};
  private saveLastUpdateMapTimeout?: number;

  constructor(
    private httpClient: HttpClient
  ) {
    this.initLastUpdateMap();
  }

  private initLastUpdateMap(): void {
    this.lastUpdateMap = JSON.parse(localStorage.getItem(LAST_UPDATE_DB_NAME) || '{}');
  }

  private saveLastUpdateMap(key: string, value: string, op: LastUpdateOp): void {
    if (op === 'none') {
      return;
    }
    switch (op) {
      case 'U':
        this.lastUpdateMap[key] = value;
        break;
      case 'R':
        delete this.lastUpdateMap[key];
        break;
    }

    if (this.saveLastUpdateMapTimeout) {
      clearTimeout(this.saveLastUpdateMapTimeout);
    }
    setTimeout(() => {
      localStorage.setItem(LAST_UPDATE_DB_NAME, JSON.stringify(this.lastUpdateMap))
    }, 250);
  }

  private addPendingChanges(url: string, request: Observable<unknown>): void {
    this.pendingChangesMap.set(url, request);
    this.notifyPendingChanges();
  }

  private removePendingChanges(url: string): void {
    this.pendingChangesMap.delete(url);
    this.notifyPendingChanges();
  }

  private clearPendingChanges(): void {
    this.pendingChangesMap.clear();
    this.notifyPendingChanges();
  }

  private notifyPendingChanges(): void {
    this.pendingChanges$.next(this.pendingChangesMap.size);
  }

  private getLastUpdatesMap(): Observable<LastUpdateRemote> {
    return this.httpClient.get<any>(ApiUrls.lastUpdates).pipe(this.MAP_DATA('', {dontParse: true, lastUpdateOp: 'none'}));
  }

  private getWithCache<R>(url: string, extra: Extra): Observable<R> {
    const cachedItem = extra.cacheKey && localStorage.getItem(extra.cacheKey);
    if (!extra.noCache && cachedItem || cachedItem === '') {
      return extra.dontParse ? of(cachedItem) : of(JSON.parse(cachedItem));
    }
    const cachedRequest = this.requestOptimizer.get(url);
    if (cachedRequest) {
      return cachedRequest;
    }
    const request = this.httpClient.get(url).pipe(
      tap(({data}: any) => localStorage.setItem(extra.cacheKey, data)),
      this.MAP_DATA<any, R>(extra.cacheKey, {dontParse: extra.dontParse, lastUpdateOp: 'U'}),
      tap(() => this.requestOptimizer.delete(url)),
      shareReplay()
    );
    this.requestOptimizer.set(url, request)
    return request;
  }

  private postWithCache<R>(url: string, data: R, extra: Extra): Observable<R> {
    const itemToCache = extra.dontParse ? data as unknown as string : JSON.stringify(data);
    localStorage.setItem(extra.cacheKey, itemToCache);
    const lastUpdatedAt = this.lastUpdateMap[extra.cacheKey];
    const request = this.httpClient.post(url, {data: itemToCache, lastUpdatedAt})
      .pipe(
        this.MAP_DATA<any, R>(extra.cacheKey, {dontParse: extra.dontParse, lastUpdateOp: 'U'}),
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
    const cachedItem = extra.cacheKey && localStorage.getItem(extra.cacheKey);
    const data = extra.dontParse ? cachedItem : JSON.parse(cachedItem || 'null');
    localStorage.removeItem(extra.cacheKey);
    const lastUpdatedAt = this.lastUpdateMap[extra.cacheKey];
    const request = this.httpClient.delete(url, {body: {lastUpdatedAt}})
      .pipe(
        this.MAP_DATA<any, R>(extra.cacheKey, {dontParse: extra.dontParse, lastUpdateOp: 'R'}),
        ApiService.HANDLE_ANONYMOUS(data)
        );
    return request.pipe(
      catchError(() => {
        this.addPendingChanges(url, request);
        return of(data);
      })
    );
  }

  getOutOfSync$(): Observable<boolean> {
    return this.outOfSync$.asObservable();
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
    return forkJoin(
      requestMap
    ).pipe(
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

  getSettings(noCache?: boolean): Observable<FullSettings | undefined> {
    return this.getWithCache<FullSettings | undefined>(ApiUrls.settings, {cacheKey: OPTS_DB_NAME, noCache})
      .pipe(ApiService.HANDLE_ANONYMOUS<FullSettings | undefined>(undefined));
  }

  setSettings(opts: FullSettings): Observable<FullSettings> {
    return this.postWithCache(ApiUrls.settings, opts, {cacheKey: OPTS_DB_NAME});
  }

  setEventList(eventListCompressed: string): Observable<string> {
    return this.postWithCache(ApiUrls.eventList, eventListCompressed, {cacheKey: DB_NAME, dontParse: true});
  }

  getEventList(noCache?: boolean): Observable<string | undefined> {
    return this.getWithCache<string | undefined>(ApiUrls.eventList, {cacheKey: DB_NAME, dontParse: true, noCache})
      .pipe(ApiService.HANDLE_ANONYMOUS<string | undefined>(undefined));
  }

  getEventDescription(id: string, noCache?: boolean): Observable<string> {
    return this.getWithCache(ApiUrls.description(id), {cacheKey: DESCRIPTIONS_DB_NAME(id), dontParse: true, noCache});
  }

  setEventDescription(id: string, description: string): Observable<string> {
    return this.postWithCache(ApiUrls.description(id), description, {
      cacheKey: DESCRIPTIONS_DB_NAME(id),
      dontParse: true
    });
  }

  deleteEventDescription(id: string): Observable<string> {
    return this.deleteWithCache(ApiUrls.description(id), {cacheKey: DESCRIPTIONS_DB_NAME(id), dontParse: true});
  }

  getEventDetail(id: string, noCache?: boolean): Observable<CommonSpacedRepModel> {
    return this.getWithCache(ApiUrls.detail(id), {cacheKey: DETAIL_DB_NAME(id), noCache});
  }

  setEventDetail(id: string, detail: CommonSpacedRepModel): Observable<CommonSpacedRepModel> {
    return this.postWithCache(ApiUrls.detail(id), detail, {cacheKey: DETAIL_DB_NAME(id)});
  }

  deleteEventDetail(id: string): Observable<string> {
    return this.deleteWithCache(ApiUrls.detail(id), {cacheKey: DETAIL_DB_NAME(id)});
  }

  sync(): Observable<unknown> {
    this.clearPendingChanges();
    this.resetOutOfSync();
    return this.getLastUpdatesMap().pipe(
      catchError((error: string | HttpErrorResponse) => {
        // No network
        if ((error instanceof HttpErrorResponse && [504, 0].includes(error.status))
          // Anonymous login
          || error === ERROR_ANONYMOUS) {
          return of({
            eventList: '',
            eventDescriptions: [],
            eventDetails: [],
            settings: ''
          });
        }
        return throwError(() => error);
      }),
      switchMap( (lastUpdateMap: LastUpdateRemote) => {
        const requests: Observable<unknown>[] = [];

        const {eventList: elTime, eventDescriptions: edesTime, eventDetails: edetTime, settings: setTime} = lastUpdateMap;

        if (setTime && isAfter(setTime, this.lastUpdateMap[OPTS_DB_NAME])) {
          requests.push(this.getSettings(true));
        }

        if (elTime && isAfter(elTime, this.lastUpdateMap[DB_NAME])) {
          requests.push(this.getEventList(true));
        }

        edetTime.forEach(({id, updatedAt}) => {
          if (isAfter(updatedAt, this.lastUpdateMap[DETAIL_DB_NAME(id)])) {
            requests.push(this.getEventDetail(id, true));
          }
        });

        edesTime.forEach(({id, updatedAt}) => {
          if (isAfter(updatedAt, this.lastUpdateMap[DESCRIPTIONS_DB_NAME(id)])) {
            requests.push(this.getEventDescription(id, true));
          }
        });

        return forkJoin(requests).pipe(defaultIfEmpty(undefined))
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
    this.initLastUpdateMap();
    return of(undefined);
  }

  setOutOfSync() {
    this.outOfSync$.next(true);
  }

  resetOutOfSync() {
    this.outOfSync$.next(false);
  }

  isSomethingPresent(): boolean {
    return !!localStorage.getItem(DB_NAME) && !!localStorage.getItem(OPTS_DB_NAME);
  }
}
