import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { SpacedRepModel } from '../../models/spaced-rep.model';
import { animate, style, transition, trigger } from '@angular/animations';
import { QNAService } from '../../services/q-n-a.service';
import { BehaviorSubject, debounceTime, map, Observable, shareReplay, tap } from 'rxjs';
import { UntilDestroy } from '@ngneat/until-destroy';

interface SegmentInput {
  correct: number;
  total: number;
  wrong: number;
}

@UntilDestroy()
@Component({
  selector: 'app-day-events-view',
  templateUrl: './day-events-view.component.html',
  styleUrls: ['./day-events-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger(
      'enterAnimation', [
        transition(':enter', [
          style({height: '0'}),
          animate('250ms', style({height: '*'}))
        ]),
        transition(':leave', [
          style({height: '*'}),
          animate('250ms', style({height: '0'}))
        ])
      ]
    )
  ],
})
export class DayEventsViewComponent implements OnChanges {

  @Input()
  events?: SpacedRepModel[];

  @Input()
  isOpen?: boolean;

  @Output() eventClicked = new EventEmitter<{
    event: SpacedRepModel;
    sourceEvent: MouseEvent | KeyboardEvent;
  }>();

  private segmentsMapInt$ = new BehaviorSubject<Record<string, Observable<SegmentInput>>>({});
  segmentsMap$: Observable<Record<string, Observable<SegmentInput>>>;

  constructor(
    private qnaService: QNAService
  ) {
    console.log('constructed');

    this.segmentsMap$ = this.segmentsMapInt$.pipe(
      debounceTime(100),
      tap((segmentsMap) => {
        this.events?.forEach(e => {
          segmentsMap[e.id] = this.qnaService.get(e.linkedSpacedRepId || e.id, e.id).pipe(
            map( qnas => {
              const segmentInput: SegmentInput = {
                correct: 0,
                total: 0,
                wrong: 0
              };
              qnas.forEach(qna => {
                segmentInput.total += 1;
                if (qna.status === 'correct') {
                  segmentInput.correct += 1;
                }
                if (qna.status === 'wrong') {
                  segmentInput.wrong += 1;
                }
              });
              return segmentInput;
            })
          )
        });
      }),
      shareReplay(1)
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log({changes});
    if(changes['isOpen'] || changes['events']) {
      this.qnaService.reset();
      this.segmentsMapInt$.next({});
    }
  }
}
