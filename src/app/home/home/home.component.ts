import { Component, OnDestroy, OnInit } from '@angular/core';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { EventFormService } from '../services/event-form.service';
import { SpacedRepService } from '../services/spaced-rep.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { catchError, debounceTime, finalize, map, Observable, of, Subject, Subscription, switchMap, tap } from 'rxjs';
import { CommonSpacedRepModel, Photo, SpacedRepModel } from '../models/spaced-rep.model';
import { isSameDay, isSameMonth } from 'date-fns';
import { ConfirmationService } from 'primeng/api';
import { ExtendedCalendarView, SRCCalendarView } from '../calendar-header/calendar-header.component';
import { SettingsService } from '../services/settings.service';
import { Category } from '../models/settings.model';

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
  categoryOpts: Category[] = [];
  initialCategory: string = '';

  constructor(
    public eventFormService: EventFormService,
    private settingsService: SettingsService,
    private spacedRepService: SpacedRepService,
    private confirmationService: ConfirmationService
  ) {
    this.events$ = this.spacedRepService.getAll().pipe(
      tap(() => {
        this.categoryOpts = this.settingsService.categories;
        this.initialCategory = this.settingsService.currentCategory;
      }),
      map(events => events.map(srModel => {
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

  changeCategory(category: string) {
    this.spacedRepService.changeCategory(category);
  }

  createSpacedRep(): void {
    if (!this.eventFormService.isValid()) {
      return;
    }
    const createSpacedRep = this.eventFormService.getCreateSpacedRep();
    this.loading = true;
    this.spacedRepService.create(createSpacedRep)
      .pipe(
        untilDestroyed(this),
        switchMap((commonSr) => this.savePhotos(commonSr)),
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

  reloadPhotos({event, callback}: { event: SpacedRepModel, callback: (photos?: Photo[]) => void }) {
    this.loading = true;
    this.loadPhotos(event, true).pipe(
      untilDestroyed(this),
      tap(event => callback(event.photos)),
      finalize(() => this.loading = false)
    ).subscribe();
  }

  private loadPhotos(event: SpacedRepModel, withRetry: boolean): Observable<SpacedRepModel> {
    return this.spacedRepService.getPhotos(event).pipe(
      map(photos => {
        event.photos = photos;
        return event;
      }),
      catchError(() => {
        if (!withRetry) {
          return of(event);
        }
        const respObs$ = new Subject();

        this.confirmationService.confirm({
          icon: 'pi pi-exclamation-triangle',
          header: 'Error while loading photos',
          message: 'You can retry the load or you can just skip it for the moment',
          acceptLabel: 'Skip',
          acceptIcon: 'hidden',
          accept: () => respObs$.next('skip'),
          rejectLabel: 'Retry',
          rejectIcon: 'hidden',
          reject: () => respObs$.next('retry')
        });

        return respObs$.pipe(
          switchMap(retry => {
            if (retry === 'retry') {
              return this.loadPhotos(event, withRetry);
            } else {
              return of(event).pipe(
                finalize(() => respObs$.complete())
              );
            }
          })
        )
      })
    );
  }

  editEvent(event: SpacedRepModel): void {
    this.spacedRepService.get(event.id as string).pipe(
      untilDestroyed(this),
      switchMap((sr: SpacedRepModel) =>
        this.loadPhotos(sr, false)
      ),
      tap(fullEvent => {
        this.eventToModify = fullEvent;
        this.openEdit = true;

        const autoSavingTimer = this.settingsService.generalOptions.autoSavingTimer;
        if (autoSavingTimer) {
          this.removeAutoSaving();
          this.autoSaveSub = this.eventFormService.onEditedSpacedRep().pipe(
            debounceTime(autoSavingTimer * 1000),
            tap(() => this.saveEvent(true))
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

  private savePhotos(event: CommonSpacedRepModel): Observable<unknown> {
    const photos = this.eventFormService.getPhotos();
    return this.spacedRepService.savePhotos(event, photos).pipe(
      catchError(() => {
        const respObs$ = new Subject<string>();

        this.confirmationService.confirm({
          icon: 'pi pi-exclamation-triangle',
          header: 'Error while saving photos',
          message: 'You can retry the saving or you can just skip. If you skip the save the changes done to the photo, if any, will NOT be saved.',
          acceptLabel: 'Skip',
          acceptIcon: 'hidden',
          accept: () => respObs$.next('skip'),
          rejectLabel: 'Retry',
          rejectIcon: 'hidden',
          reject: () => respObs$.next('retry')
        });

        return respObs$.pipe(
          switchMap(retry => {
            if (retry === 'retry') {
              return this.savePhotos(event);
            } else {
              return of(event).pipe(
                // Perche' serve???
                // https://stackoverflow.com/questions/47031924/when-using-rxjs-why-doesnt-switchmap-trigger-a-complete-event
                // L'outer non completa in automatico se l'inner completa
                finalize(() => respObs$.complete())
              );
            }
          })
        )
      })
    );
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
      switchMap(() => {
        if (autoSaving) {
          this.autoSavingState = 'saved';
          this.lastAutoSave = new Date();
          return of();
        } else {
          return this.savePhotos(event);
        }
      }),
      finalize(() => {
        if (!autoSaving) {
          this.loading = false;
          this.openEdit = false;
        }
      })
    ).subscribe();
  }
}
