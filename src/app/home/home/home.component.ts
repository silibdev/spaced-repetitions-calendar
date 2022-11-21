import { Component, OnDestroy, OnInit } from '@angular/core';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { EventFormService } from '../services/event-form.service';
import { SpacedRepService } from '../services/spaced-rep.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { debounce, debounceTime, finalize, map, Observable, of, Subscription, switchMap, tap } from 'rxjs';
import { SpacedRepModel } from '../models/spaced-rep.model';
import { isSameDay, isSameMonth } from 'date-fns';
import { ConfirmationService } from 'primeng/api';
import { ExtendedCalendarView, SRCCalendarView } from '../calendar-header/calendar-header.component';
import { SettingsService } from '../services/settings.service';

@UntilDestroy()
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [ConfirmationService]
})
export class HomeComponent implements OnInit, OnDestroy {
  view: ExtendedCalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  SRCCalendarView = SRCCalendarView;

  viewDate: Date = new Date();

  events$: Observable<CalendarEvent[]>;

  open = false;
  loading = false
  activeDayIsOpen = false;
  eventToModify?: SpacedRepModel;
  openEdit?: boolean;
  editEventModel?: SpacedRepModel;
  autoSaveSub?: Subscription;
  autoSavingState?: 'saving' | 'saved' | undefined;
  lastAutoSave?: Date;

  constructor(
    public eventFormService: EventFormService,
    private settingsService: SettingsService,
    private spacedRepService: SpacedRepService,
    private confirmationService: ConfirmationService
  ) {
    this.events$ = this.spacedRepService.getAll().pipe(
      map( events => events.map( srModel => {
        const calendarEvent: CalendarEvent & SpacedRepModel = srModel;
        calendarEvent.cssClass = '';
        if (calendarEvent.boldTitle) {
          calendarEvent.cssClass += 'src-bold-title ';
        }
        if (calendarEvent.highlightTitle) {
          calendarEvent.cssClass += 'src-highlight-title';
        }
        return calendarEvent;
      }))
    );
  }

  ngOnInit(): void {
  }

  ngOnDestroy() {
    this.removeAutoSaving();
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
    this.spacedRepService.get(event.id as string).pipe(
      untilDestroyed(this),
      tap(fullEvent => {
        this.eventToModify = fullEvent;
        this.openEdit = true;

        const autoSavingTimer = this.settingsService.generalOptions.autoSavingTimer;
        if (autoSavingTimer) {
          this.removeAutoSaving();
          this.autoSaveSub = this.eventFormService.onEditedSpacedRep().pipe(
            debounceTime(autoSavingTimer * 1000),
            tap( () => this.saveEvent(true))
          ).subscribe();
        }

      })
    ).subscribe()
  }

  removeAutoSaving(): void {
    if (this.autoSaveSub) {
      this.autoSaveSub.unsubscribe();
    }
  }

  showEditEvent() {
    this.editEventModel = this.eventToModify;
  }

  closeEditEvent(): void {
    this.eventToModify = undefined;
    this.editEventModel = undefined;
    this.removeAutoSaving();
  }

  confirmDeleteEvent(): void {
    const isMasterMessage = !this.eventToModify?.linkedSpacedRepId ? ' (Deleting this will delete the whole series!)' : '';
    this.confirmationService.confirm({
      message: 'Are you sure do you want to delete this repetition?' + isMasterMessage,
      accept: () => this.deleteEvent()
    });
  }

  deleteEvent(): void {
    this.loading = true;
    this.spacedRepService.deleteEvent(this.eventToModify).pipe(
      untilDestroyed(this),
      finalize(() => {
        this.loading = false;
        this.openEdit = false;
      })
    ).subscribe()
  }

  saveEvent(autoSaving?: boolean): void {
    if (!this.eventFormService.isValid()) {
      return;
    }
    if (autoSaving) {
      this.autoSavingState = 'saving';
    } else {
      this.loading = true;
      this.removeAutoSaving();
    }
    const event = this.eventFormService.getEditedSpacedRep();
    this.spacedRepService.save(event).pipe(
      untilDestroyed(this),
      finalize(() => {
        if (autoSaving) {
          this.autoSavingState = 'saved';
          this.lastAutoSave = new Date();
        } else {
          this.loading = false;
          this.openEdit = false;
        }
      })
    ).subscribe();
  }
}
