import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';

export interface LoadingStatus {
  total: number;
  current: number;
}

@Injectable({
  providedIn: 'root'
})
export class LoaderService {

  private loading$ = new BehaviorSubject<LoadingStatus>({current: 0, total: 0});

  isLoading$: Observable<boolean>;

  loadingStatus$: Observable<LoadingStatus>;

  constructor() {
    this.isLoading$ = this.loading$.pipe(
      map( loadingStatus => loadingStatus.current === loadingStatus.total)
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
    loadingStatus.current += 1;
    if (loadingStatus.current === loadingStatus.total) {
      loadingStatus.current = 0;
      loadingStatus.total = 0;
    }
    this.loading$.next(loadingStatus);
  }
}
