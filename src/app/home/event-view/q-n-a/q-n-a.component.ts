import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import {
  BehaviorSubject,
  combineLatestWith,
  map,
  Observable,
  shareReplay,
} from 'rxjs';
import { QNA, QNAStatus } from '../../models/spaced-rep.model';
import confetti from 'canvas-confetti';
import { ConfirmationService } from 'primeng/api';
import { QNAFormService } from '../../services/q-n-a-form.service';
import { SoundsService } from '../../services/sounds.service';

@Component({
  selector: 'app-q-n-a',
  templateUrl: './q-n-a.component.html',
  styleUrls: ['./q-n-a.component.scss'],
  providers: [ConfirmationService],
})
export class QNAComponent implements OnChanges, OnDestroy {
  @Input()
  ids: { masterId: string; eventId: string } | undefined;

  qna$?: Observable<QNA[]>;
  enableDelete = false;

  private reorder$ = new BehaviorSubject(true);

  constructor(
    private qnaFormService: QNAFormService,
    private confirmationService: ConfirmationService,
    private soundsService: SoundsService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ids']) {
      this.loadQNA(changes['ids'].currentValue);
    }
  }

  private loadQNA(ids: { masterId: string; eventId: string } | undefined) {
    this.enableDelete = false;
    this.qna$ = this.qnaFormService.load(ids?.masterId, ids?.eventId).pipe(
      combineLatestWith(this.reorder$),
      map(([qna]) => qna.sort((a, b) => a.question.localeCompare(b.question))),
      shareReplay(1),
    );
  }

  reorderQnas(): void {
    this.reorder$.next(true);
  }

  setStatus(qna: QNA, status: 'R' | 'C' | 'W') {
    // Reset | Correct | Wrong
    const s: Record<string, QNAStatus> = {
      R: undefined,
      C: 'correct',
      W: 'wrong',
    };
    qna.status = s[status];

    const audioMap = {
      C: () => this.soundsService.playSound('correct'),
      W: () => this.soundsService.playSound('wrong'),
      R: () => Promise.resolve(),
    };

    const audioPromise = audioMap[status]();
    audioPromise.then(() => {
      if (this.qnaFormService.areAllAnswered()) {
        this.soundsService.playSound('complete');
        confetti({
          zIndex: 999999,
          origin: {
            x: 0.5,
            y: 0.75,
          },
          shapes: ['circle', 'square', 'star'],
          spread: 90,
          particleCount: 100,
        });
      }
    });
  }

  addQNA() {
    this.qnaFormService.addNewQNA();
  }

  deleteQNA(qna: QNA) {
    this.qnaFormService.deleteQNA(qna);
  }

  confirmDelete(qna: QNA, event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Are you sure that you want to proceed?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteQNA(qna);
      },
    });
  }

  enableDeleteQNA() {
    this.enableDelete = true;
  }

  disableDeleteQNA() {
    this.enableDelete = false;
  }

  ngOnDestroy() {
    confetti.reset();
  }

  // Quill focus trap doesn't seem to work properly anymore
  // this is a workaround
  keyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.stopPropagation();
    }
  }
}
