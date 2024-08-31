import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  CommonSpacedRepModel,
  extractCommonModel,
  Photo,
  SpacedRepModel,
} from '../models/spaced-rep.model';
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
    event: CommonSpacedRepModel,
    photos: Photo[],
    confirmationService?: ConfirmationService,
  ): Observable<unknown> {
    const { masterId } = extractCommonModel(event);
    if (!photos.length) {
      return of(undefined);
    }
    return this.apiService.savePhotos(masterId, photos, confirmationService);
  }

  getPhotos(event: SpacedRepModel): Observable<Photo[]> {
    const { masterId } = extractCommonModel(event);
    return this.apiService.getPhotos(masterId);
  }

  getPhotoUrl(event: SpacedRepModel, photoId: string): Observable<string> {
    const { masterId } = extractCommonModel(event);
    return this.apiService.getPhotoUrl(masterId, photoId);
  }
}
