import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import { SpacedRepModel } from '../../models/spaced-rep.model';
import { animate, style, transition, trigger } from '@angular/animations';
import { QNAService } from '../../services/q-n-a.service';
import {
  BehaviorSubject,
  debounceTime,
  filter,
  map,
  Observable,
  shareReplay,
  tap,
} from 'rxjs';
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
    trigger('enterAnimation', [
      transition(':enter', [
        style({ height: '0' }),
        animate('250ms', style({ height: '*' })),
      ]),
      transition(':leave', [
        style({ height: '*' }),
        animate('250ms', style({ height: '0' })),
      ]),
    ]),
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

  private segmentsMapInt$ = new BehaviorSubject<
    Record<string, Observable<SegmentInput>>
  >({});
  segmentsMap$: Observable<Record<string, Observable<SegmentInput>>>;

  constructor(private qnaService: QNAService) {
    this.segmentsMap$ = this.segmentsMapInt$.pipe(
      debounceTime(100),
      filter(() => !!this.isOpen),
      tap((segmentsMap) => {
        this.events?.forEach((e) => {
          segmentsMap[e.id] = this.qnaService
            .get(e.linkedSpacedRepId || e.id, e.id)
            .pipe(
              map((qnas) => {
                const segmentInput: SegmentInput = {
                  correct: 0,
                  total: 0,
                  wrong: 0,
                };
                qnas.forEach((qna) => {
                  segmentInput.total += 1;
                  if (qna.status === 'correct') {
                    segmentInput.correct += 1;
                  }
                  if (qna.status === 'wrong') {
                    segmentInput.wrong += 1;
                  }
                });
                return segmentInput;
              }),
            );
        });
      }),
      shareReplay(1),
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    const isOpenChange = changes['isOpen'];
    const changeEvents = changes['events'];
    if (
      (isOpenChange && isOpenChange.currentValue === false) ||
      (changeEvents &&
        this.eventsAreDifferent(
          changeEvents.currentValue,
          changeEvents.previousValue,
        ))
    ) {
      this.qnaService.reset();
      this.segmentsMapInt$.next({});
    }
  }

  private eventsAreDifferent(
    currentValue: SpacedRepModel[] | undefined,
    previousValue: SpacedRepModel[] | undefined,
  ) {
    if (!currentValue || !previousValue) {
      return true;
    }
    if (currentValue.length !== previousValue.length) {
      return true;
    }
    const currSet = new Set(currentValue.map((e) => e.id));
    const prevSet = new Set(previousValue.map((e) => e.id));
    if ([...currSet].some((e) => !prevSet.has(e))) {
      return true;
    }

    return false;
  }
}
