import { FullSettings, RepetitionSchema } from '../../models/settings.model';
import { Injectable } from '@angular/core';
import { createStore, select, setProp, setProps, withProps } from '@ngneat/elf';
import { Migrator } from '../../../migrator';
import { shareReplay, Subject } from 'rxjs';

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

  // TODO replace with actions/effect
  getSaveEvent() {
    return this._saveEvent$.asObservable();
  }

  get settings() {
    return this.store.getValue();
  }

  getSettings() {
    return this.store.pipe(shareReplay(1));
  }

  getCategories() {
    return this.store.pipe(
      select((state) => state.category.opts),
      shareReplay(1),
    );
  }

  getActiveCategory() {
    return this.store.pipe(
      select((state) => state.category.current),
      shareReplay(1),
    );
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

  setActiveCategory(category: string) {
    this.store.update(
      setProp('category', (state) => ({ ...state, current: category })),
    );
  }

  addRepetitionSchemaOpt(repetitionSchema: RepetitionSchema) {
    const repetitionSchemaOpts = this.settings.repetitionSchemaOpts;
    if (
      repetitionSchemaOpts.find((rs) => rs.value === repetitionSchema.value)
    ) {
      return;
    }

    this.store.update(
      setProp('repetitionSchemaOpts', [
        ...repetitionSchemaOpts,
        repetitionSchema,
      ]),
    );
  }
}
