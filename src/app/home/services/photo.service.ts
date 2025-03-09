import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Photo } from '../models/spaced-rep.model';
import { ApiService } from './api.service';
import { UntilDestroy } from '@ngneat/until-destroy';
import { ConfirmationService } from 'primeng/api';

@UntilDestroy()
@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  constructor(private apiService: ApiService) {}

  savePhotos(
    masterId: string,
    photos: Photo[],
    confirmationService?: ConfirmationService,
  ): Observable<unknown> {
    if (!photos.length) {
      return of(undefined);
    }
    return this.apiService.savePhotos(masterId, photos, confirmationService);
  }

  getPhotos(masterId: string): Observable<Photo[]> {
    return this.apiService.getPhotos(masterId);
  }

  getPhotoUrl(masterId: string, photoId: string): Observable<string> {
    return this.apiService.getPhotoUrl(masterId, photoId);
  }
}
