import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { QNAService } from '../../services/q-n-a.service';
import { Observable } from 'rxjs';
import { QNA } from '../../models/spaced-rep.model';

@Component({
  selector: 'app-q-n-a',
  templateUrl: './q-n-a.component.html',
  styleUrls: ['./q-n-a.component.scss']
})
export class QNAComponent implements OnChanges {
  @Input()
  id: string | undefined;

  qna$?: Observable<QNA[]>;

  constructor(
    private qnaService: QNAService
  ) {
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

    this.qna$ = this.qnaService.load(id);
  }
}
