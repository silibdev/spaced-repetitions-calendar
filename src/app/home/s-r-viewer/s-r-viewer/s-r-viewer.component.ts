import { Component, OnInit } from '@angular/core';
import {
  ExtendedCalendarView,
  SRCCalendarView,
} from '../../calendar-header/calendar-header.component';
import { BehaviorSubject, delay, finalize, map, Observable, zip } from 'rxjs';
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
import { untilDestroyed } from '@ngneat/until-destroy';
import { ConfirmationService } from 'primeng/api';
import { QNAFormService } from '../../services/q-n-a-form.service';

@Component({
  selector: 'app-s-r-viewer',
  templateUrl: './s-r-viewer.component.html',
  styleUrls: ['./s-r-viewer.component.scss'],
})
export class SRViewerComponent implements OnInit {
  view: ExtendedCalendarView = CalendarView.Month;
  openCreate: boolean = false;
  loadingCreate: boolean = false;
  CalendarView = CalendarView;
  SRCCalendarView = SRCCalendarView;

  filter$: Observable<SRFilter>;
  events$: Observable<CalendarEvent[]>;
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
  ) {
    this.filter$ = this.srViewerUIRepository.getFilter();
    this.events$ = this.srEventRepository.getAll();
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

  ngOnInit(): void {}

  changeCategory(category: string) {
    this.settingsRepository.setActiveCategory(category);
  }

  editEvent(event: SREvent): void {
    console.log('edit event', event);
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
}
