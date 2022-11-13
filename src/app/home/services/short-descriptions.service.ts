import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { stringify } from '@angular/compiler/src/util';

export const SHORT_DESCRIPTIONS_DB_NAME = 'src-short-desc-db';

@Injectable({
  providedIn: 'root'
})
export class ShortDescriptionsService {

  constructor() {
  }

  private static getInternalId(id: string): string {
    return SHORT_DESCRIPTIONS_DB_NAME + id;
  }

  get(id: string): Observable<string> {
    const shortDescription = localStorage.getItem(ShortDescriptionsService.getInternalId(id))
    return of(shortDescription || '');
  }

  save(id: string, shortDescription: string): Observable<string> {
    localStorage.setItem(ShortDescriptionsService.getInternalId(id), shortDescription);
    return of(shortDescription);
  }

  delete(id: string): Observable<string> {
    localStorage.removeItem(ShortDescriptionsService.getInternalId(id));
    return of(id);
  }
}
