import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-multi-segment-bar',
  templateUrl: './multi-segment-bar.component.html',
  styleUrls: ['./multi-segment-bar.component.scss']
})
export class MultiSegmentBarComponent {

  @Input()
  total: number = 0;

  @Input()
  correct: number = 0;

  @Input()
  wrong: number = 0;

  get other(): number {
    return this.total - this.correct - this.wrong;
  }
}
