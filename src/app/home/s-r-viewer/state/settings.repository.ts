import { FullSettings } from '../../models/settings.model';
import { Injectable } from '@angular/core';
import { createStore, select, setProp, setProps, withProps } from '@ngneat/elf';
import { Migrator } from '../../../migrator';
import { Subject } from 'rxjs';

const DEFAULT_COLORS = [
  {
    label: 'Blue',
    value: '#0072c3',
  },
  {
    label: 'Green',
    value: '#00d011',
  },
  {
    label: 'Yellow',
    value: '#ffe016',
  },
  {
    label: 'Red',
    value: '#da1e28',
  },
  {
    label: 'Purple',
    value: '#8a3ffc',
  },
  {
    label: 'Orange',
    value: '#ff7605',
  },
];

const DEFAULT_CATEGORIES = [{ label: 'Default', value: 'default' }];

@Injectable({
  providedIn: 'root',
})
export class SettingsRepository {
  private static NAME = 'settings';
  private _saveEvent$ = new Subject<void>();

  private store = createStore(
    { name: SettingsRepository.NAME },
    withProps<FullSettings>({
      repetitionSchemaOpts: [
        { label: '1;7;30;90', value: '1;7;30;90' },
        { label: '1;5;15;30', value: '1;5;15;30' },
      ],
      autoSavingTimer: 15,
      currentVersion: Migrator.LATEST_VERSION,
      colors: DEFAULT_COLORS,
      category: {
        opts: DEFAULT_CATEGORIES,
        current: DEFAULT_CATEGORIES[0].value,
      },
    }),
  );

  getSaveEvent() {
    return this._saveEvent$.asObservable();
  }

  get settings() {
    return this.store.getValue();
  }

  getSettings() {
    return this.store.asObservable();
  }

  setSettings(
    opts: FullSettings,
    extra: { emitEvent: boolean } = { emitEvent: true },
  ) {
    this.store.update(setProps(opts));
    if (extra.emitEvent) {
      this._saveEvent$.next();
    }
  }

  getActiveCategory() {
    return this.store.pipe(select((state) => state.category.current));
  }

  setActiveCategory(category: string) {
    this.store.update(
      setProp('category', (state) => ({ ...state, current: category })),
    );
  }

  getCategories() {
    return this.store.pipe(select((state) => state.category.opts));
  }
}
