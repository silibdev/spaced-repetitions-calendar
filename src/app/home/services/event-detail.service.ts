import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CommonSpacedRepModel } from '../models/spaced-rep.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class EventDetailService {
  constructor(private apiService: ApiService) {}

  get(id: string): Observable<CommonSpacedRepModel> {
    return this.apiService.getEventDetail(id);
  }

  save(
    id: string,
    { ...event }: CommonSpacedRepModel,
  ): Observable<CommonSpacedRepModel> {
    return this.apiService.setEventDetail(id, event);
  }

  delete(id: string): Observable<string> {
    return this.apiService.deleteEventDetail(id);
  }
}
