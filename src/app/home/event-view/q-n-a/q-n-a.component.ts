import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { QNA, QNAStatus } from '../../models/spaced-rep.model';
import { Utils } from '../../../utils';
import confetti from 'canvas-confetti';
import { ConfirmationService } from 'primeng/api';
import { QNAFormService } from '../../services/q-n-a-form.service';

@Component({
  selector: 'app-q-n-a',
  templateUrl: './q-n-a.component.html',
  styleUrls: ['./q-n-a.component.scss'],
  providers: [ConfirmationService]
})
export class QNAComponent implements OnChanges, OnDestroy {

  @Input()
  ids: { masterId: string, eventId: string } | undefined;

  qna$?: Observable<QNA[]>;
  enableDelete = false;

  private correctAudio = new Audio();
  private wrongAudio = new Audio();
  private completeAudio = new Audio();

  constructor(
    private qnaFormService: QNAFormService,
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
    if (changes['ids']) {
      this.loadQNA(changes['ids'].currentValue);
    }
  }

  private loadQNA(ids: { masterId: string, eventId: string } | undefined) {
    this.enableDelete = false;
    this.qna$ = this.qnaFormService.load(ids?.masterId, ids?.eventId);
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
      if (this.qnaFormService.areAllAnswered()) {
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
