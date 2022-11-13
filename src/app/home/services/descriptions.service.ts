import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

const DESCRIPTIONS_DB_NAME = 'src-desc-db';

@Injectable({
  providedIn: 'root'
})
export class DescriptionsService {

  constructor() {
  }

  private static getInternalId(id: string): string {
    return DESCRIPTIONS_DB_NAME + id;
  }

  get(id: string): Observable<string> {
    const description = localStorage.getItem(DescriptionsService.getInternalId(id))
    return of(description || '');
  }

  save(id: string, description: string): Observable<string> {
    localStorage.setItem(DescriptionsService.getInternalId(id), description);
    return of(description);
  }

  delete(id: string): Observable<string> {
    localStorage.removeItem(DescriptionsService.getInternalId(id));
    return of(id);
  }

  cleanDb(ids: Set<string>): Observable<unknown> {
    const internalIds = new Set<string>();
    ids.forEach( id => {
      const internalId = DescriptionsService.getInternalId(id);
      internalIds.add(internalId);
    });

    Object.keys(localStorage).forEach( key => {
      if (key.includes(DESCRIPTIONS_DB_NAME) && !internalIds.has(key)) {
        localStorage.removeItem(key);
      }
      return;
    });
    return of(undefined);
  }
}
