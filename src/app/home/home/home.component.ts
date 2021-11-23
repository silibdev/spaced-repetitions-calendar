import { Component, OnInit } from '@angular/core';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { EventFormService } from '../services/event-form.service';
import { SpacedRepService } from '../services/spaced-rep.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { finalize, Observable } from 'rxjs';
import { SpacedRepModel } from '../models/spaced-rep.model';
import { isSameDay, isSameMonth } from 'date-fns';

@UntilDestroy()
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;

  viewDate: Date = new Date();
  currentEvents?: SpacedRepModel[];

  events$: Observable<CalendarEvent[]>;

  open = false;
  loading = false
  activeDayIsOpen = false;
  eventToModify?: SpacedRepModel;
  openEdit?: boolean;

  constructor(
    public eventFormService: EventFormService,
    private spacedRepService: SpacedRepService
  ) {
    this.events$ = this.spacedRepService.getAll();
  }

  ngOnInit(): void {
  }

  createSpacedRep(): void {
    if (!this.eventFormService.isValid()) {
      return;
    }
    const createSpacedRep = this.eventFormService.getCreateSpacedRep();
    this.loading = true;
    this.spacedRepService.create(createSpacedRep)
      .pipe(untilDestroyed(this),
        finalize(() => {
          this.loading = false;
          this.open = false;
        })
      ).subscribe()
  }

  dayClicked({date, events}: { date: Date; events: CalendarEvent[] }): void {
    if (isSameMonth(date, this.viewDate)) {
      this.activeDayIsOpen = !((isSameDay(this.viewDate, date) && this.activeDayIsOpen) || events.length === 0);
      this.viewDate = date;
    }
  }

  editEvent(event: SpacedRepModel): void {
    this.eventToModify = event;
    this.openEdit = true;
  }

  closeEditEvent(): void {
    this.eventToModify = undefined;
  }

  deleteEvent(): void {
    this.loading = true;
    this.spacedRepService.deleteEvent(this.eventToModify).pipe(
      untilDestroyed(this),
      finalize( () => {
        this.loading = false;
        this.openEdit = false;
      })
    ).subscribe()
  }

  saveEvent(): void {
    if (!this.eventFormService.isValid()) {
      return;
    }
    this.loading = true;
    const event = this.eventFormService.getEditedSpacedRep();
    this.spacedRepService.save(event).pipe(
      untilDestroyed(this),
      finalize( () => {
        this.loading = false;
        this.openEdit = false;
      })
    ).subscribe();
  }
}
