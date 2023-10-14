import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  BehaviorSubject,
  catchError,
  defaultIfEmpty,
  finalize,
  forkJoin,
  map,
  MonoTypeOperatorFunction,
  Observable,
  of,
  OperatorFunction,
  shareReplay,
  Subject,
  switchMap,
  tap,
  throwError
} from 'rxjs';
import { FullSettings } from '../models/settings.model';
import { ERROR_ANONYMOUS } from './auth.interceptor';
import { CommonSpacedRepModel, Photo, QNA } from '../models/spaced-rep.model';
import { AppStorage } from '../../app.storage';
import { ConfirmationService } from 'primeng/api';

const ApiUrls = {
  settings: '/api/settings',
  eventList: '/api/event-list',
  deleteAllData: '/api/data',
  description: (eventId: string) => `/api/event-descriptions?id=${eventId}`,
  detail: (eventId: string) => `/api/event-details?id=${eventId}`,
  lastUpdates: '/api/last-updates',
  photos: (eventId: string, photoId?: string) => `/api/photos?id=${eventId}${photoId ? '&photoId=' + photoId : ''}`,
  qnas: (masterId: string, eventId: string, qnaId?: string) => `/api/qnas?id=${eventId}&masterId=${masterId}${qnaId ? '&qnaId=' + qnaId : ''}`
}

const OPTS_DB_NAME = 'src-opts-db';

export const DESCRIPTIONS_DB_NAME_PREFIX = 'src-desc-db';
const DESCRIPTIONS_DB_NAME = (id: string) => DESCRIPTIONS_DB_NAME_PREFIX + id;

const OLD_SHORT_DESCRIPTION_DB_NAME = 'src-short-desc-db';
export const DETAIL_DB_NAME_PREFIX = 'src-event-detail-db';
const DETAIL_DB_NAME = (id: string) => DETAIL_DB_NAME_PREFIX + id;

export const LAST_UPDATE_DB_NAME = 'src-last-update-db';

export const DB_NAME = 'src-db';

interface Extra {
  cacheKey: string,
  noCache?: boolean,
  dontParse?: boolean
}

type LastUpdateOp = 'U' | 'R' | 'none'

interface LastUpdateRemote {
  eventList: string;
  eventDescriptions: { id: string, updatedAt: string }[];
  eventDetails: { id: string, updatedAt: string }[];
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
  public static MAX_FILE_UPLOAD = 6 * 1000 * 1000 //6MB

  private outOfSync$ = new BehaviorSubject(false);

  private MAP_DATA<T extends { data: string, updatedAt?: string }, R>(cacheKey: string, extra: {
    dontParse?: boolean,
    lastUpdateOp: LastUpdateOp
  }): OperatorFunction<T, R> {
    return (obs) => obs.pipe(
      map((resp) => {
        const {data, updatedAt} = resp;
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
      return throwError(() => error);
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
    this.saveLastUpdateMapTimeout = setTimeout(() => {
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
    return this.httpClient.get<any>(ApiUrls.lastUpdates).pipe(this.MAP_DATA('', {
      dontParse: true,
      lastUpdateOp: 'none'
    }));
  }

  private getWithCache<R>(url: string, {cacheKey, noCache, dontParse}: Extra): Observable<R> {
    return AppStorage.getItem(cacheKey).pipe(
      switchMap(cachedItem => {
        if (!noCache && (cachedItem || cachedItem === '')) {
          return dontParse ? of(cachedItem) : of(JSON.parse(cachedItem));
        }
        const cachedRequest = this.requestOptimizer.get(url);
        if (cachedRequest) {
          return cachedRequest;
        }
        const request = this.httpClient.get(url).pipe(
          switchMap((resp: any) => AppStorage.setItem(cacheKey, resp.data).pipe(
            map(() => resp))
          ),
          this.MAP_DATA<any, R>(cacheKey, {dontParse: dontParse, lastUpdateOp: 'U'}),
          tap(() => this.requestOptimizer.delete(url)),
          shareReplay()
        );
        this.requestOptimizer.set(url, request)
        return request;
      })
    );
  }

  private postWithCache<R>(url: string, data: R, {cacheKey, dontParse}: Extra): Observable<R> {
    const itemToCache = dontParse ? data as unknown as string : JSON.stringify(data);
    return AppStorage.setItem(cacheKey, itemToCache).pipe(
      switchMap(() => {
        const lastUpdatedAt = this.lastUpdateMap[cacheKey];
        const request = this.httpClient.post(url, {data: itemToCache, lastUpdatedAt})
          .pipe(
            this.MAP_DATA<any, R>(cacheKey, {dontParse: dontParse, lastUpdateOp: 'U'}),
            ApiService.HANDLE_ANONYMOUS(data)
          );
        return request.pipe(
          catchError(() => {
            this.addPendingChanges(url, request);
            return of(data);
          })
        );
      })
    );
  }

  private deleteWithCache<R>(url: string, {cacheKey, dontParse}: Extra): Observable<R> {
    return AppStorage.getItem(cacheKey).pipe(
      map(cachedItem => dontParse ? cachedItem : JSON.parse(cachedItem || 'null')),
      switchMap(data => AppStorage.removeItem(cacheKey).pipe(map(() => (data)))),
      switchMap(data => {
        const lastUpdatedAt = this.lastUpdateMap[cacheKey];
        const request = this.httpClient.delete(url, {body: {lastUpdatedAt}})
          .pipe(
            this.MAP_DATA<any, R>(cacheKey, {dontParse: dontParse, lastUpdateOp: 'R'}),
            ApiService.HANDLE_ANONYMOUS(data)
          );
        return request.pipe(
          catchError(() => {
            this.addPendingChanges(url, request);
            return of(data);
          })
        );
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
      switchMap((lastUpdateMap: LastUpdateRemote) => {
        const requests: Observable<unknown>[] = [];

        const {
          eventList: elTime,
          eventDescriptions: edesTime,
          eventDetails: edetTime,
          settings: setTime
        } = lastUpdateMap;

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

  desyncLocal(): Observable<unknown> {
    Object.keys(localStorage)
      .filter(k => k.startsWith('src-'))
      .forEach(k => localStorage.removeItem(k));
    return AppStorage.desyncLocal().pipe(
      tap(() => {
        this.initLastUpdateMap();
      })
    );
  }

  setOutOfSync() {
    this.outOfSync$.next(true);
  }

  resetOutOfSync() {
    this.outOfSync$.next(false);
  }

  isSomethingPresent(): Observable<boolean> {
    return AppStorage.getItem(DB_NAME).pipe(
      map(data => !!data && !!localStorage.getItem(OPTS_DB_NAME))
    );
  }

  deleteAllData() {
    return this.httpClient.delete(ApiUrls.deleteAllData);
  }

  savePhotos(masterId: string, photos: Photo[], confirmationService?: ConfirmationService): Observable<unknown> {
    let somethingToSaveIsPresent = false;
    const firstFormData = new FormData();
    firstFormData.set('id', masterId);
    photos.filter(p => p.id && !p.toDelete).forEach(p => {
        firstFormData.append('photoMetadata', JSON.stringify({id: p.id, name: p.name, toDelete: p.toDelete}));
        somethingToSaveIsPresent = true;
      }
    );

    const photosToDelete = photos.filter(p => p.toDelete);

    const photoBlobs = photos
      .filter(p => !p.id)
      .map(p =>
        fetch(p.thumbnail)
          .then(r => r.blob())
          // .then(blob => new Promise<Blob>((resolve, error) => {
          //   // @ts-ignore
          //   new CompressorJS(blob, {
          //     success: (blobCompressed: Blob) => resolve(blobCompressed),
          //     error: (err: any) => error(err)
          //   });
          // }))
          .then(blob => ({name: p.name, blob}))
      );

    // @ts-ignore
    const getFormDataSize = (fd: FormData) => [...fd].reduce((size, [name, value]) =>
      size + (typeof value === 'string' ? value.length : value.size), 0
    );


    return forkJoin([
      forkJoin(photoBlobs).pipe(
        defaultIfEmpty([]),
        switchMap(blobs => {
          const dataGrouped = [firstFormData];
          let i = 0;
          let currSize = getFormDataSize(dataGrouped[i]);
          blobs.forEach(b => {
            const blobSize = b.blob.size;
            currSize += blobSize;
            if (currSize > ApiService.MAX_FILE_UPLOAD) {
              const formData = new FormData();
              dataGrouped.push(formData);
              i += 1;
              currSize = blobSize;
            }
            dataGrouped[i].append('newPhotos', b.blob, b.name);
            somethingToSaveIsPresent = true;
          });

          if (!somethingToSaveIsPresent) {
            return of(undefined);
          }
          return forkJoin(
            dataGrouped.map(data =>
            {
              const message = 'There are problems with '
                + data.getAll('newPhotos').map(f => typeof f !== 'string' ? `"${f.name}"` : '').join(', ') + '. '
                + 'You can retry the saving or you can just skip. '
                + 'If you skip the save the changes done to the photo, if any, will NOT be saved.';

              return this.callWithRetry(
                this.httpClient.post(ApiUrls.photos(masterId), data),
                confirmationService,
                {
                  header:'Error while saving photos',
                  message
                }
              )
            }
            )
          );
        })
      ),
      ...photosToDelete.map(p => this.httpClient.delete(ApiUrls.photos(masterId, p.id)))
    ]);
  }

  getPhotos(masterId: string): Observable<Photo[]> {
    return this.httpClient.get(ApiUrls.photos(masterId)).pipe(
      map<any, Photo[]>(res => res.data)
    );
  }

  getPhotoUrl(masterId: string, photoId: string): Observable<string> {
    return this.httpClient.get(ApiUrls.photos(masterId, photoId), {responseType: 'blob'}).pipe(
      map<Blob, string>(res => {
        return URL.createObjectURL(res);
      })
    );
  }

  getQNA(masterId: string, eventId: string): Observable<QNA[]> {
    return this.httpClient.get(ApiUrls.qnas(masterId, eventId)).pipe(
      map<any, QNA[]>(res => res.data)
    );
  }

  setQNA(masterId: string, eventId: string, qna: QNA, confirmationService?: ConfirmationService): Observable<{id: string} | undefined> {
    const question = qna.question.length > 50 ? qna.question.substring(0, 50) + '...' : qna.question;
    return this.callWithRetry(this.httpClient.post(ApiUrls.qnas(masterId, eventId, qna.id), {data: qna}).pipe(
      map<any, {id: string}>(res => res.data)
    ),
      confirmationService, {
      header: 'Error while saving Q&A',
      message: `"${question}" could not be saved. Try again or skip it.`
    });
  }

  deleteQNA(masterId: string, eventId: string, qna: QNA, confirmationService?: ConfirmationService): Observable<unknown> {
    const question = qna.question.length > 50 ? qna.question.substring(0, 50) + '...' : qna.question;
    return this.callWithRetry(
      this.httpClient.delete(ApiUrls.qnas(masterId, eventId, qna.id)),
      confirmationService,
      {
        header: 'Error while deleting Q&A',
        message: `"${question}" could not be deleted. Try again or skip it.`
      }
    );
  }

  private callWithRetry<D>(obs: Observable<D>, confirmationService?: ConfirmationService, confOpts?: {header: string, message: string}): Observable<D> {
    return obs.pipe(
      catchError<any, Observable<D>>((err) => {
        if (!confirmationService || !confOpts) {
          return err;
        }
        const respObs$ = new Subject<string>();

        confirmationService.confirm({
          icon: 'pi pi-exclamation-triangle',
          header: confOpts.header,
          message: confOpts.message,
          acceptLabel: 'Skip',
          acceptIcon: 'hidden',
          accept: () => respObs$.next('skip'),
          rejectLabel: 'Retry',
          rejectIcon: 'hidden',
          reject: () => respObs$.next('retry')
        });

        return respObs$.pipe(
          switchMap(retry => {
            let retObs$;
            if (retry === 'retry') {
              retObs$ = this.callWithRetry(obs, confirmationService, confOpts);
            } else {
              retObs$ = of(undefined);
            }
            return retObs$.pipe(
              // https://stackoverflow.com/questions/47031924/when-using-rxjs-why-doesnt-switchmap-trigger-a-complete-event
              // L'outer non completa in automatico se l'inner completa
              // @ts-ignore
              finalize(() => respObs$.complete())
            );
          })
        );
      })
    );
  }
}
