import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';

export interface LoadingStatus {
  total: number;
  finished: number;
}

@Injectable({
  providedIn: 'root'
})
export class LoaderService {

  private loading$ = new BehaviorSubject<LoadingStatus>({finished: 0, total: 0});

  isLoading$: Observable<boolean>;

  loadingStatus$: Observable<LoadingStatus>;

  constructor() {
    this.isLoading$ = this.loading$.pipe(
      map( loadingStatus => loadingStatus.finished === loadingStatus.total)
    );

    this.loadingStatus$ = this.loading$.asObservable();
  }

  startLoading(): void {
    const {...loadingStatus} = this.loading$.value;
    loadingStatus.total += 1;
    this.loading$.next(loadingStatus);
  }

  stopLoading(): void {
    const {...loadingStatus} = this.loading$.value;
    loadingStatus.finished += 1;

    if (loadingStatus.finished > loadingStatus.total) {
      loadingStatus.finished = loadingStatus.total;
      console.error('LoaderService: called stop without a start!');
    }

    if (loadingStatus.finished === loadingStatus.total) {
      loadingStatus.finished = 0;
      loadingStatus.total = 0;
    }
    console.log('stop', loadingStatus);
    this.loading$.next(loadingStatus);
  }
}
