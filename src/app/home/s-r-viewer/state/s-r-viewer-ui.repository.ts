import { Injectable } from '@angular/core';
import { createStore, select, setProps, withProps } from '@ngneat/elf';
import { isSameDay, isSameMonth } from 'date-fns';
import { Category } from '../../models/settings.model';
import { SettingsRepository } from './settings.repository';
import {
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  shareReplay,
} from 'rxjs';

export interface SRFilter {
  date: Date;
  activeCategory: string;
}

export interface SRViewerUI {
  filterDate: Date;
  activeDayOpen: boolean;
  categories: Category[];
}

@Injectable({
  providedIn: 'root',
})
export class SRViewerUIRepository {
  private static NAME = 's-r-viewer-ui';

  private store = createStore(
    { name: SRViewerUIRepository.NAME },
    withProps<SRViewerUI>({
      filterDate: new Date(),
      activeDayOpen: false,
      categories: [],
    }),
  );

  constructor(private settingsRepository: SettingsRepository) {}

  getFilter(): Observable<SRFilter> {
    return combineLatest([
      this.store.pipe(
        select((state) => state.filterDate),
        distinctUntilChanged((a, b) => a.toISOString() === b.toISOString()),
      ),
      this.settingsRepository.getActiveCategory().pipe(distinctUntilChanged()),
    ]).pipe(
      map(([filterDate, activeCategory]) => ({
        date: filterDate,
        activeCategory,
      })),
      shareReplay(1),
    );
  }

  getActiveDayOpen() {
    return this.store.pipe(select((state) => state.activeDayOpen));
  }

  setFilterDate(filterDate: Date) {
    this.store.update(setProps({ filterDate, activeDayOpen: false }));
  }

  setActiveDayInfo(newActiveDay: Date) {
    this.store.update(
      setProps((state) => {
        const activeMonth = state.filterDate;

        if (!isSameMonth(activeMonth, newActiveDay)) {
          return { ...state, filterDate: newActiveDay };
        }

        const oldOpen = state.activeDayOpen;
        const oldDay = state.filterDate;
        if (isSameDay(oldDay, newActiveDay)) {
          return {
            ...state,
            activeDayOpen: !oldOpen,
          };
        }

        return {
          ...state,
          filterDate: newActiveDay,
          activeDayOpen: true,
        };
      }),
    );
  }
}
