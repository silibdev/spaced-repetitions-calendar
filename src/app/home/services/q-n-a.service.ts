import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  defaultIfEmpty,
  finalize,
  forkJoin,
  map,
  Observable,
  Subscription,
  tap,
} from 'rxjs';
import { QNA } from '../models/spaced-rep.model';
import { ApiService } from './api.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ConfirmationService } from 'primeng/api';

@UntilDestroy()
@Injectable({
  providedIn: 'root',
})
export class QNAService {
  private qnasStore$ = new BehaviorSubject<Record<string, QNA[]>>({});
  private currentCallMap!: Record<string, Subscription | undefined>;

  constructor(private apiService: ApiService) {
    this.reset();
  }

  reset() {
    this.qnasStore$.next({});
    this.currentCallMap = {};
  }

  private getFromRemote(masterId: string, id: string): Observable<QNA[]> {
    return this.apiService.getQNA(masterId, id).pipe(
      tap((qnas) => this.updateStore(id, qnas)),
      untilDestroyed(this),
    );
  }

  private updateStore(id: string, qnas: QNA[]) {
    this.qnasStore$.value[id] = qnas;
    this.qnasStore$.next(this.qnasStore$.value);
  }

  get(masterId: string, id: string): Observable<QNA[]> {
    const qnas = this.qnasStore$.value[id];
    if (!qnas) {
      const currentCall = this.currentCallMap[id];
      if (!currentCall) {
        this.currentCallMap[id] = this.getFromRemote(masterId, id)
          .pipe(finalize(() => (this.currentCallMap[id] = undefined)))
          .subscribe();
      }
    }
    return this.qnasStore$.asObservable().pipe(map((qnas) => qnas[id] || []));
  }

  save(
    masterId: string,
    id: string,
    qnas: QNA[],
    qnasToDelete: QNA[],
    confirmationService: ConfirmationService,
  ) {
    function pred(x: QNA | undefined): x is QNA {
      return x !== undefined;
    }

    return forkJoin([
      ...qnas.map((q) =>
        this.apiService.setQNA(masterId, id, q, confirmationService).pipe(
          tap((res) => {
            if (res) {
              q.id = res.id;
            }
          }),
          map((qna) => qna && q),
        ),
      ),
      ...qnasToDelete.map((q) =>
        this.apiService
          .deleteQNA(masterId, id, q, confirmationService)
          .pipe(map(() => undefined)),
      ),
    ]).pipe(
      defaultIfEmpty([] as any),
      tap((returnQNA: (QNA | undefined)[]) => {
        this.updateStore(id, returnQNA.filter<QNA>(pred));
      }),
    );
  }
}
