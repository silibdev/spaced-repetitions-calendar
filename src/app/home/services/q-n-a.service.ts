import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { QNA } from '../models/spaced-rep.model';

@Injectable({
  providedIn: 'root'
})
export class QNAService {

  constructor() { }

  load(id: string): Observable<QNA[]> {
    return of([
      {
        answer: 'A1',
        question: 'Q1',
        status: 'correct'
      },
      {
        answer: 'A2',
        question: 'Q2',
        status: 'wrong'
      },
      {
        answer: 'A3',
        question: 'Q3',
        status: undefined
      }
    ])
  }
}
