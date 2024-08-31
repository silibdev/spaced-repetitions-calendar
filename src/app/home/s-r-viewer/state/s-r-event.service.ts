import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service';
import {
  debounceTime,
  defaultIfEmpty,
  distinctUntilChanged,
  forkJoin,
  map,
  Observable,
  switchMap,
  tap,
} from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { SREventRepository } from './s-r-event.repository';
import { SRViewerUIRepository } from './s-r-viewer-ui.repository';
import { SpacedRepModel } from '../../models/spaced-rep.model';
import { EventDetailService } from '../../services/event-detail.service';
import { isSameMonth } from 'date-fns';
import { DEFAULT_CATEGORY } from '../../models/settings.model';

@UntilDestroy()
@Injectable({
  providedIn: 'root',
})
export class SREventService {
  constructor(
    private apiService: ApiService,
    private srViewerUIService: SRViewerUIRepository,
    private srEventRepository: SREventRepository,
    private eventDetailService: EventDetailService,
  ) {
    this.srViewerUIService
      .getFilter()
      .pipe(
        untilDestroyed(this),
        debounceTime(250),
        distinctUntilChanged(({ date: aDate, ...a }, { date: bDate, ...b }) => {
          // Check if the rest is equal
          if (JSON.stringify(a) !== JSON.stringify(b)) {
            // if not, ok they are different for sure
            return false;
          }
          // otherwise the only difference could be the date
          // but in our case the date is different only if it refers
          // to a different month (the api returns the entire month data)
          return isSameMonth(aDate, bDate);
        }),
        switchMap((filter) =>
          this.loadSREvents(filter.date).pipe(
            map((events) => {
              const activeCategory = filter.activeCategory;
              return events.filter((e: SpacedRepModel) => {
                if (!e.category && activeCategory === DEFAULT_CATEGORY) {
                  return true;
                }
                return e.category === activeCategory;
              });
            }),
          ),
        ),
        tap((events) => this.srEventRepository.setList(events)),
      )
      .subscribe();
  }

  private loadSREvents(middleDate: Date): Observable<SpacedRepModel[]> {
    return this.apiService.getEventList(middleDate, true).pipe(
      map((events) => {
        return (
          events?.map((e) => ({
            ...e,
            start: new Date(e.start),
          })) || []
        );
      }),
      switchMap((events) =>
        forkJoin(
          events.map((e) =>
            this.eventDetailService.get(e.linkedSpacedRepId || e.id).pipe(
              map((details) => ({
                ...details,
                ...e,
              })),
            ),
          ),
        ).pipe(defaultIfEmpty([])),
      ),
    );
  }

  load() {}
}
