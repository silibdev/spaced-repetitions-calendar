import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { SpacedRepModel } from '../../models/spaced-rep.model';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-day-events-view',
  templateUrl: './day-events-view.component.html',
  styleUrls: ['./day-events-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
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
export class DayEventsViewComponent {

  @Input()
  events?: SpacedRepModel[];

  @Input()
  isOpen?: boolean;

  @Output() eventClicked = new EventEmitter<{
    event: SpacedRepModel;
    sourceEvent: MouseEvent | KeyboardEvent;
  }>();
}
