import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CommonSpacedRepModel } from '../models/spaced-rep.model';

const EVENT_DETAIL_DB_NAME = 'src-event-detail-db';
const OLD_SHORT_DESCRIPTION_DB_NAME = 'src-short-desc-db';

@Injectable({
  providedIn: 'root'
})
export class EventDetailService {

  constructor() {
  }

  private static getInternalId(id: string): string {
    return EVENT_DETAIL_DB_NAME + id;
  }

  getSecondMigration(id: string): Observable<string> {
    const internalId = OLD_SHORT_DESCRIPTION_DB_NAME + id;
    const shortDescription = localStorage.getItem(internalId)
    return of(shortDescription || '');
  }

  get(id: string): Observable<CommonSpacedRepModel> {
    const eventToGet = localStorage.getItem(EventDetailService.getInternalId(id));
    const event: CommonSpacedRepModel = JSON.parse(eventToGet || '');
    return of(event);
  }

  save(id: string, {...event}: CommonSpacedRepModel): Observable<CommonSpacedRepModel> {
    const eventToSave: any = {...event};
    localStorage.setItem(EventDetailService.getInternalId(id), JSON.stringify(eventToSave));
    return of(event);
  }

  delete(id: string): Observable<string> {
    localStorage.removeItem(EventDetailService.getInternalId(id));
    return of(id);
  }

  cleanDb(ids: Set<string>): Observable<unknown> {
    const internalIds = new Set<string>();
    ids.forEach( id => {
      const internalId = EventDetailService.getInternalId(id);
      internalIds.add(internalId);
    });

    Object.keys(localStorage).forEach( key => {
      if (key.includes(OLD_SHORT_DESCRIPTION_DB_NAME)) {
        localStorage.removeItem(key)
      }
      if (key.includes(EVENT_DETAIL_DB_NAME) && !internalIds.has(key)) {
        localStorage.removeItem(key);
      }
      return;
    });
    return of(undefined);
  }
}
