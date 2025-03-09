import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  ExtendedCalendarView,
  SRCCalendarView,
} from '../../calendar-header/calendar-header.component';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  delay,
  finalize,
  map,
  Observable,
  of,
  skip,
  Subject,
  Subscription,
  switchMap,
  tap,
  zip,
} from 'rxjs';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { Category } from '../../models/settings.model';
import { SpacedRepRepository, SREvent } from '../state/spaced-rep.repository';
import {
  SRFilter,
  SRViewerUIRepository,
} from '../state/s-r-viewer-ui.repository';
import { SpacedRepService } from '../state/spaced-rep.service';
import { SettingsRepository } from '../state/settings.repository';
import { EventFormService } from '../../services/event-form.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ConfirmationService } from 'primeng/api';
import { QNAFormService } from '../../services/q-n-a-form.service';
import {
  extractCommonModel,
  Photo,
  SpacedRepModel,
} from '../../models/spaced-rep.model';
import { PhotoService } from '../../services/photo.service';

@UntilDestroy()
@Component({
  selector: 'app-s-r-viewer',
  templateUrl: './s-r-viewer.component.html',
  styleUrls: ['./s-r-viewer.component.scss'],
})
export class SRViewerComponent implements OnInit, OnDestroy {
  view: ExtendedCalendarView = CalendarView.Month;
  openCreate: boolean = false;
  loadingCreate: boolean = false;
  loadingEdit: boolean = false;

  CalendarView = CalendarView;
  SRCCalendarView = SRCCalendarView;

  filter$: Observable<SRFilter>;
  events$: Observable<CalendarEvent[]>;
  editEvent$: Observable<SpacedRepModel | null>;
  openEdit$: Observable<boolean>;
  autoSavingState?: 'saving' | 'saved' | undefined;
  autoSaveSub?: Subscription;
  lastAutoSave?: Date;
  categories$: Observable<Category[]>;
  activeCategory$: Observable<string>;
  activeDayOpen$: Observable<boolean>;

  notifier = new BehaviorSubject(null);

  constructor(
    private srEventRepository: SpacedRepRepository,
    private srViewerUIRepository: SRViewerUIRepository,
    private srEventService: SpacedRepService,
    private settingsRepository: SettingsRepository,
    public eventFormService: EventFormService,
    private confirmationService: ConfirmationService,
    private qnaFormService: QNAFormService,
    private photoService: PhotoService,
  ) {
    this.filter$ = this.srViewerUIRepository.getFilter();
    this.events$ = this.srEventRepository.getAll();
    this.editEvent$ = this.srEventRepository.getEditEvent().pipe(
      switchMap((sr) => {
        if (!sr) {
          return of(null);
        }
        return this.loadPhotos(sr, false).pipe(
          map((photos) => {
            sr.photos = photos;
            return sr;
          }),
        );
      }),
      tap((sr) => {
        if (!sr) {
          return;
        }
        this.autoSavingState = undefined;
        const autoSavingTimer =
          this.settingsRepository.settings.autoSavingTimer;
        if (autoSavingTimer) {
          this.removeAutoSaving();
          this.autoSaveSub = this.eventFormService
            .onEditedSpacedRep()
            .pipe(
              skip(1),
              debounceTime(autoSavingTimer * 1000),
              tap(() => this.saveEvent(true)),
            )
            .subscribe();
        }
      }),
    );
    this.openEdit$ = this.editEvent$.pipe(map((e) => !!e));
    this.activeDayOpen$ = this.srViewerUIRepository.getActiveDayOpen();

    this.categories$ = this.settingsRepository.getCategories();
    this.activeCategory$ = this.settingsRepository.getActiveCategory();

    // This handle the case of multiple confirmation called in rapid succession
    // the new confirmation object is passed only after the notifier (that emits when the confirmDialog is closed) emits
    const oldConfirmation = this.confirmationService.requireConfirmation$;
    this.confirmationService.requireConfirmation$ = zip(
      oldConfirmation,
      this.notifier.pipe(delay(1000)),
    ).pipe(map(([conf]) => conf));

    this.srEventService.load();
  }

  private removeAutoSaving(): void {
    if (this.autoSaveSub) {
      this.autoSaveSub.unsubscribe();
    }
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.removeAutoSaving();
  }

  changeCategory(category: string) {
    this.settingsRepository.setActiveCategory(category);
  }

  editEvent(event: SREvent): void {
    this.srEventService.loadEventToEdit(event);
  }

  closeEditEvent(visible: boolean): void {
    if (visible) {
      return;
    }
    this.srEventRepository.resetEditEvent();
    this.removeAutoSaving();
  }

  private loadPhotos(
    event: SpacedRepModel,
    withRetry: boolean,
  ): Observable<Photo[] | undefined> {
    return this.photoService.getPhotos(extractCommonModel(event).masterId).pipe(
      catchError(() => {
        if (!withRetry) {
          return of(undefined);
        }
        const respObs$ = new Subject();

        this.confirmationService.confirm({
          icon: 'pi pi-exclamation-triangle',
          header: 'Error while loading photos',
          message:
            'You can retry the load or you can just skip it for the moment',
          acceptLabel: 'Skip',
          acceptIcon: 'hidden',
          accept: () => respObs$.next('skip'),
          rejectLabel: 'Retry',
          rejectIcon: 'hidden',
          reject: () => respObs$.next('retry'),
        });

        return respObs$.pipe(
          switchMap((retry) => {
            if (retry === 'retry') {
              return this.loadPhotos(event, withRetry);
            } else {
              return of(undefined).pipe(finalize(() => respObs$.complete()));
            }
          }),
        );
      }),
    );
  }

  reloadPhotos({
    event,
    callback,
  }: {
    event: SpacedRepModel;
    callback: (photos?: Photo[]) => void;
  }) {
    this.loadingEdit = true;
    this.loadPhotos(event, true)
      .pipe(
        untilDestroyed(this),
        tap((photos) => callback(photos)),
        finalize(() => (this.loadingEdit = false)),
      )
      .subscribe();
  }

  viewDateChange(viewDate: Date) {
    this.srViewerUIRepository.setFilterDate(viewDate);
  }

  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    if (!events.length) {
      return;
    }
    this.srViewerUIRepository.setActiveDayInfo(date);
  }

  createSpacedRep(): void {
    if (!this.eventFormService.isValid()) {
      return;
    }
    const createSpacedRep = this.eventFormService.getCreateSpacedRep();
    const photos = this.eventFormService.getPhotos();
    const qnas = this.qnaFormService.qnas;
    const qnasToDelete = this.qnaFormService.qnasToDelete;
    this.loadingCreate = true;
    this.srEventService
      .createCompleteSpacedRep(
        createSpacedRep,
        photos,
        qnas,
        qnasToDelete,
        this.confirmationService,
      )
      .pipe(
        untilDestroyed(this),
        finalize(() => {
          this.loadingCreate = false;
          this.openCreate = false;
        }),
      )
      .subscribe();
  }

  saveEvent(autoSaving?: boolean): void {
    if (!this.eventFormService.isValid()) {
      return;
    }
    if (autoSaving) {
      this.autoSavingState = 'saving';
    } else {
      this.loadingEdit = true;
      this.removeAutoSaving();
    }
    const srModel = this.eventFormService.getEditedSpacedRep();
    srModel.photos = this.eventFormService.getPhotos();

    const qnas = this.qnaFormService.qnas;
    const qnasToDelete = this.qnaFormService.qnasToDelete;

    this.srEventService.updateSREvent({
      srModel,
      qnas,
      qnasToDelete,
      onDone: () => {
        if (!autoSaving) {
          this.loadingEdit = false;
          this.closeEditEvent(false);
        }
      },
      cs: this.confirmationService,
    });
  }

  deleteEvent(srEvent?: SpacedRepModel) {
    this.srEventService.deleteEditEvent({
      srEvent,
      cs: this.confirmationService,
    });
  }
}
