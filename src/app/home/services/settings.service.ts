import { Injectable } from '@angular/core';
import {
  Category,
  Color,
  DEFAULT_CATEGORY,
  FullSettings,
  Options,
  RepetitionSchema,
  RepetitionType,
  RepetitionTypeEnum,
} from '../models/settings.model';
import { ApiService } from './api.service';
import {
  distinctUntilChanged,
  Observable,
  Observer,
  of,
  ReplaySubject,
  shareReplay,
  tap,
} from 'rxjs';
import { Migrator } from '../../migrator';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private $currentCategorySubject: ReplaySubject<string> = new ReplaySubject(1);

  repetitionTypeOpts: RepetitionType[] = [
    { label: 'Custom', value: RepetitionTypeEnum.CUSTOM },
    { label: 'Every day', value: RepetitionTypeEnum.EVERY_DAY },
    { label: 'Once a week', value: RepetitionTypeEnum.ONCE_A_WEEK },
  ];

  get repetitionSchemaOpts(): RepetitionSchema[] {
    return this.opts.repetitionSchemaOpts;
  }

  get defaultRepetitionSchema(): RepetitionSchema {
    return this.repetitionSchemaOpts[0];
  }

  get generalOptions(): Options {
    return {
      autoSavingTimer: this.opts.autoSavingTimer,
    };
  }

  get colors(): Color[] {
    return this.opts.colors;
  }

  get categories(): Category[] {
    return this.opts.category.opts;
  }

  get currentCategory(): string {
    return this.opts.category.current;
  }

  get $currentCategory(): Observable<string> {
    return this.$currentCategorySubject
      .asObservable()
      .pipe(distinctUntilChanged(), shareReplay(1));
  }

  private defaultColors = [
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

  private defaultCategories = [
    { label: 'Default', value: DEFAULT_CATEGORY },
    { label: 'Category 1', value: 'cod1' },
  ];

  // This default are merged with the already present ones
  // it is a shallow merge so be careful in using nested objects!
  private opts: FullSettings = {
    repetitionSchemaOpts: [
      { label: '1;7;30;90', value: '1;7;30;90' },
      { label: '1;5;15;30', value: '1;5;15;30' },
    ],
    autoSavingTimer: 15,
    currentVersion: Migrator.LATEST_VERSION,
    colors: this.defaultColors,
    category: {
      opts: this.defaultCategories,
      current: DEFAULT_CATEGORY,
    },
  };

  constructor(private apiService: ApiService) {}

  loadOpts(): Observable<unknown> {
    return this.apiService.getSettings().pipe(
      tap((opts) => {
        if (opts) {
          this.opts = opts;
          this.$currentCategorySubject.next(this.opts.category.current);
          Migrator.setVersion(this.opts.currentVersion);
          if (!this.opts.currentVersion) {
            this.saveOpts();
          }
        } else {
          // it'll save the default options
          this.saveOpts();
        }
      }),
    );
  }

  saveOpts(subscriber?: Partial<Observer<any>>): void {
    this.opts.currentVersion = Migrator.getVersion();

    this.$currentCategorySubject.next(this.opts.category.current);
    this.apiService.setSettings(this.opts).subscribe({
      next: (resp) => {
        subscriber?.next && subscriber.next(resp);
      },
      error: (error) => {
        subscriber?.error && subscriber.error(error);
      },
      complete: () => {
        subscriber?.complete && subscriber.complete();
      },
    });
  }

  saveGeneralOptions(opts: Options): boolean {
    const { autoSavingTimer } = opts;
    if (autoSavingTimer < 0) {
      return false;
    }
    this.opts.autoSavingTimer = autoSavingTimer;
    this.saveOpts();
    return true;
  }

  saveNewRepetitionSchema(repSchema: string): boolean {
    if (!this.repetitionSchemaOpts.find((rs) => rs.value === repSchema)) {
      this.opts.repetitionSchemaOpts.push({
        value: repSchema,
        label: repSchema,
      });
      this.saveOpts();
      return true;
    } else {
      return false;
    }
  }

  editRepetitionSchema(index: number, repSchema: string): boolean {
    if (!this.repetitionSchemaOpts.find((rs) => rs.value === repSchema)) {
      const repSchemaOpt = this.repetitionSchemaOpts[index];
      // could be an out of bound (how?)
      if (repSchemaOpt) {
        repSchemaOpt.value = repSchema;
        repSchemaOpt.label = repSchema;
        this.saveOpts();
        return true;
      } else {
        return this.saveNewRepetitionSchema(repSchema);
      }
    } else {
      return false;
    }
  }

  deleteRepetitionSchema(index: number): void {
    const repSchema = this.repetitionSchemaOpts[index].value;
    this.opts.repetitionSchemaOpts = this.repetitionSchemaOpts.filter(
      (rs) => rs.value !== repSchema,
    );
    this.saveOpts();
  }

  fifthMigration() {
    if (this.opts.colors) {
      return of(undefined);
    }
    this.opts.colors = this.defaultColors;
    this.saveOpts();
    return new Observable<undefined>((subscriber) => {
      this.saveOpts(subscriber);
    });
  }

  sixthMigration() {
    if (this.opts.category) {
      return of(undefined);
    }
    this.opts.category = {
      opts: this.defaultCategories,
      current: DEFAULT_CATEGORY,
    };
    return new Observable<undefined>((subscriber) => {
      this.saveOpts(subscriber);
    });
  }

  editColor(index: number, editedColor: Color) {
    // index can be in range or +1 respect the size (if a new color)
    if (index >= this.colors.length + 1) {
      return false;
    }
    const color = this.colors[index];
    if (!color) {
      return this.saveNewColor(editedColor);
    } else {
      color.value = editedColor.value;
      color.label = editedColor.label;
      this.saveOpts();
      return true;
    }
  }

  private saveNewColor(color: Color) {
    if (!this.colors.find((cl) => cl.value === color.value)) {
      this.opts.colors.push({ ...color });
      this.saveOpts();
      return true;
    } else {
      return false;
    }
  }

  deleteColor(index: number) {
    const color = this.colors[index].value;
    this.opts.colors = this.colors.filter((cl) => cl.value !== color);
    this.saveOpts();
  }

  changeCurrentCategory(category: string) {
    this.opts.category.current = category;
    this.saveOpts();
  }

  editCategory(index: number, editedCategory: Category) {
    // index can be in range or +1 respect the size (if a new color)
    if (index >= this.categories.length + 1) {
      return false;
    }
    const category = this.categories[index];
    if (!category) {
      return this.saveNewCategory(editedCategory);
    } else {
      if (category.value !== editedCategory.value) {
        // This should never happen
        return false;
      }
      category.label = editedCategory.label;
      this.saveOpts();
      return true;
    }
  }

  private saveNewCategory(category: Category) {
    if (!this.categories.find((cat) => cat.value === category.value)) {
      this.opts.category.opts.push({ ...category });
      this.saveOpts();
      return true;
    } else {
      return false;
    }
  }
}
