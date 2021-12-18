import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export const DESCRIPTIONS_DB_NAME = 'src-desc-db';

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
}
