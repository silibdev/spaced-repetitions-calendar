import { defaultIfEmpty, from, map, Observable, of, tap } from 'rxjs';
import * as localforage from 'localforage';
import { DB_NAME } from './home/services/api.service';

export class AppStorage {
  static {
    console.log('storage init');
    localforage.config({name: 'src'});
  }

  static getItem<T = string>(key: string): Observable<T | null> {
    if (key === DB_NAME) {
      return from(localforage.getItem<T>(key));
    }
    return of(localStorage.getItem(key) as unknown as any);

  }

  static setItem<T = string>(key: string, data: T): Observable<T> {
    if (key === DB_NAME) {
      return from(localforage.setItem<T>(key, data));
    }
    localStorage.setItem(key, data as string);
    return of(data);
  }

  static removeItem<T = string>(key: string): Observable<null> {
    if (key === DB_NAME) {
      return from(localforage.removeItem(key)).pipe(
        defaultIfEmpty(null),
        map(() => null)
      );
    }
    localStorage.removeItem(key);
    return of(null);
  }

  static seventhMigration(): Observable<unknown> {
    const currentDB = localStorage.getItem(DB_NAME);
    if (currentDB) {
      return AppStorage.setItem(DB_NAME, currentDB).pipe(
        tap(() => localStorage.removeItem(DB_NAME))
      )
    }
    return of(null);
  }

  static desyncLocal() {
    return from(localforage.clear());
  }
}
