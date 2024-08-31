import { defaultIfEmpty, forkJoin, from, map, Observable, of, tap } from 'rxjs';
import * as localforage from 'localforage';
import {
  DB_NAME,
  DESCRIPTIONS_DB_NAME_PREFIX,
  DETAIL_DB_NAME_PREFIX,
  LAST_UPDATE_DB_NAME,
} from './home/services/api.service';

export class AppStorage {
  static {
    localforage.config({ name: 'src' });
  }

  private static keyCanBeStored(key: string): boolean {
    return (
      key === DB_NAME ||
      key.startsWith(DESCRIPTIONS_DB_NAME_PREFIX) ||
      key.startsWith(DETAIL_DB_NAME_PREFIX) ||
      key === LAST_UPDATE_DB_NAME
    );
  }

  static getItem<T = string>(key: string): Observable<T | null> {
    if (AppStorage.keyCanBeStored(key)) {
      return from(localforage.getItem<T>(key));
    }
    return of(localStorage.getItem(key) as unknown as any);
  }

  static setItem<T = string>(key: string, data: T): Observable<T> {
    if (AppStorage.keyCanBeStored(key)) {
      return from(localforage.setItem<T>(key, data));
    }
    localStorage.setItem(key, data as string);
    return of(data);
  }

  static removeItem<T = string>(key: string): Observable<null> {
    if (AppStorage.keyCanBeStored(key)) {
      return from(localforage.removeItem(key)).pipe(
        defaultIfEmpty(null),
        map(() => null),
      );
    }
    localStorage.removeItem(key);
    return of(null);
  }

  static seventhMigration(): Observable<unknown> {
    const currentDB = localStorage.getItem(DB_NAME);
    if (currentDB) {
      return AppStorage.setItem(DB_NAME, currentDB).pipe(
        tap(() => localStorage.removeItem(DB_NAME)),
      );
    }
    return of(null);
  }

  static eighthMigration(): Observable<unknown> {
    const obss = Object.entries(localStorage)
      .filter(
        ([k]) =>
          k.startsWith(DESCRIPTIONS_DB_NAME_PREFIX) ||
          k.startsWith(DETAIL_DB_NAME_PREFIX) ||
          k === LAST_UPDATE_DB_NAME,
      )
      .map(([key, value]) =>
        AppStorage.setItem(key, value).pipe(
          tap(() => localStorage.removeItem(key)),
        ),
      );
    if (obss.length) {
      return forkJoin(obss);
    }
    return of(null);
  }

  static desyncLocal() {
    return from(localforage.clear());
  }
}
