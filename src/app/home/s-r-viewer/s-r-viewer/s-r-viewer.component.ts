import { Component, OnInit } from '@angular/core';
import {
  ExtendedCalendarView,
  SRCCalendarView,
} from '../../calendar-header/calendar-header.component';
import { Observable } from 'rxjs';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { Category } from '../../models/settings.model';
import { SREvent, SREventRepository } from '../state/s-r-event.repository';
import {
  SRFilter,
  SRViewerUIRepository,
} from '../state/s-r-viewer-ui.repository';
import { SREventService } from '../state/s-r-event.service';
import { SettingsRepository } from '../state/settings.repository';

@Component({
  selector: 'app-s-r-viewer',
  templateUrl: './s-r-viewer.component.html',
  styleUrls: ['./s-r-viewer.component.scss'],
})
export class SRViewerComponent implements OnInit {
  view: ExtendedCalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  SRCCalendarView = SRCCalendarView;

  filter$: Observable<SRFilter>;
  events$: Observable<CalendarEvent[]>;
  categories$: Observable<Category[]>;
  activeCategory$: Observable<string>;
  activeDayOpen$: Observable<boolean>;

  constructor(
    private srEventRepository: SREventRepository,
    private srViewerUIRepository: SRViewerUIRepository,
    private srEventService: SREventService,
    private settingsRepository: SettingsRepository,
  ) {
    this.filter$ = this.srViewerUIRepository.getFilter();
    this.events$ = this.srEventRepository.getAll();
    this.activeDayOpen$ = this.srViewerUIRepository.getActiveDayOpen();

    this.categories$ = this.settingsRepository.getCategories();
    this.activeCategory$ = this.settingsRepository.getActiveCategory();

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
}
