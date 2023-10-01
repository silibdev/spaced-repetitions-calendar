import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { QNA } from '../models/spaced-rep.model';

@Injectable({
  providedIn: 'root'
})
export class QNAService {

  constructor() { }

  get(id: string): Observable<QNA[]> {
    return of([
      {
        id: '1',
        answer: 'A1',
        question: 'Q1',
        status: 'correct'
      },
      {
        id: '2',
        answer: 'A2',
        question: 'Q2',
        status: 'wrong'
      },
      {
        id: '3',
        answer: 'A3',
        question: 'Q3',
        status: undefined
      }
    ])
  }
}
