import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CalendarView } from 'angular-calendar';

export enum SRCCalendarView {
  List,
}

export type ExtendedCalendarView = CalendarView | SRCCalendarView;

@Component({
  selector: 'app-calendar-header',
  templateUrl: 'calendar-header.component.html',
  styleUrls: ['calendar-header.component.scss'],
})
export class CalendarHeaderComponent {
  @Input() view!: ExtendedCalendarView;

  @Input() viewDate!: Date;

  @Output() viewChange = new EventEmitter<ExtendedCalendarView>();

  @Output() viewDateChange = new EventEmitter<Date>();

  SRCCalendarView = SRCCalendarView;

  viewsOptions = [
    { label: 'Month', value: CalendarView.Month },
    // {label: 'Week', value: CalendarView.Week},
    // {label: 'Day', value: CalendarView.Day},
    { label: 'List', value: SRCCalendarView.List },
  ];
}
