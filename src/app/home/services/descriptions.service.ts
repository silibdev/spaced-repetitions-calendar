import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class DescriptionsService {
  constructor(private apiService: ApiService) {}

  get(id: string): Observable<string> {
    return this.apiService.getEventDescription(id);
  }

  save(id: string, description: string): Observable<string> {
    return this.apiService.setEventDescription(id, description);
  }

  delete(id: string): Observable<string> {
    return this.apiService.deleteEventDescription(id);
  }
}
