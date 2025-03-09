import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, switchMap } from 'rxjs';
import { QNA } from '../models/spaced-rep.model';
import { QNAService } from './q-n-a.service';

@Injectable({
  providedIn: 'root',
})
export class QNAFormService {
  get qnas(): QNA[] {
    return this.qnas$.value;
  }

  qnasToDelete: QNA[] = [];
  id?: string;

  private qnas$ = new BehaviorSubject<QNA[]>([]);

  constructor(private qnaService: QNAService) {}

  load(
    masterId: string | undefined,
    id: string | undefined,
  ): Observable<QNA[]> {
    this.id = id;
    if (!id || !masterId) {
      this.qnasToDelete = [];
      this.qnas$.next([]);
      return this.qnas$.asObservable();
    }
    return this.qnaService.get(masterId, id).pipe(
      switchMap((qnas) => {
        this.qnas$.next(qnas);
        this.qnasToDelete = [];
        return this.qnas$;
      }),
    );
  }

  addNewQNA() {
    this.qnas.push({
      question: '',
      status: undefined,
      answer: '',
    });
  }

  deleteQNA(qna: QNA) {
    const index = this.qnas?.findIndex((q) => qna === q);
    if (typeof index === 'number' && index >= 0) {
      this.qnas?.splice(index, 1);

      if (qna.id) {
        this.qnasToDelete.push(qna);
      }
    }
  }

  areAllAnswered() {
    return this.qnas.every((q) => !!q.status);
  }
}
