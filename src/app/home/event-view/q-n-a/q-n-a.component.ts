import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { QNAService } from '../../services/q-n-a.service';
import { Observable, tap } from 'rxjs';
import { QNA, QNAStatus } from '../../models/spaced-rep.model';
import { Utils } from '../../../utils';
import confetti from 'canvas-confetti';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-q-n-a',
  templateUrl: './q-n-a.component.html',
  styleUrls: ['./q-n-a.component.scss'],
  providers: [ConfirmationService]
})
export class QNAComponent implements OnChanges, OnDestroy {
  @Input()
  id: string | undefined;

  qna$?: Observable<QNA[]>;

  correctAudio = new Audio();
  wrongAudio = new Audio();
  completeAudio = new Audio();
  private qnas?: QNA[];
  enableDelete = false;

  constructor(
    private qnaService: QNAService,
    private confirmationService: ConfirmationService
  ) {
    this.correctAudio.src = 'assets/sounds/correct.mp3';
    this.correctAudio.load();

    this.wrongAudio.src = 'assets/sounds/wrong.mp3';
    this.wrongAudio.load();

    this.completeAudio.src = 'assets/sounds/complete.mp3';
    this.completeAudio.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['id']) {
      this.loadQNA(changes['id'].currentValue);
    }
  }

  private reset(): void {
  }

  private loadQNA(id: string | undefined) {
    if (!id) {
      this.reset();
      return;
    }

    this.qna$ = this.qnaService.get(id).pipe(
      tap(qnas => this.qnas = qnas)
    );
  }

  setStatus(qna: QNA, status: 'R' | 'C' | 'W') { // Reset | Correct | Wrong
    const s: Record<string, QNAStatus> = {
      R: undefined,
      C: 'correct',
      W: 'wrong'
    };
    qna.status = s[status];

    const audioMap: Record<'R' | 'C' | 'W', HTMLAudioElement | undefined> = {
      C: this.correctAudio,
      W: this.wrongAudio,
      R: undefined
    }

    const audio = audioMap[status];
    Utils.playAudio(audio).then(() => {
      if (this.qnas && this.qnas.every(q => !!q.status)) {
        Utils.playAudio(this.completeAudio);
        confetti({
          zIndex: 999999,
          origin: {
            x: 0.5,
            y: 0.75
          },
          shapes: ['circle', 'square', 'star'],
          spread: 90,
          particleCount: 200,
        });
      }
    });
  }

  addQNA() {
    this.qnas?.push({
      question: '',
      status: undefined,
      answer: ''
    })
  }

  deleteQNA(qna: QNA) {
    const index = this.qnas?.findIndex(q => qna === q);
    if (typeof index === 'number' && index >= 0) {
      this.qnas?.splice(index, 1);
    }
  }

  confirmDelete(qna: QNA, event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Are you sure that you want to proceed?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteQNA(qna);
      }
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
}
