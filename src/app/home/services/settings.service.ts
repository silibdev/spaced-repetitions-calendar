import { Injectable } from '@angular/core';
import { Color, FullSettings, Options, RepetitionSchema } from '../models/settings.model';
import { ApiService } from './api.service';
import { Observable, Observer, of, tap } from 'rxjs';
import { Migrator } from '../../migrator';


@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  get repetitionSchemaOpts(): RepetitionSchema[] {
    return this.opts.repetitionSchemaOpts;
  }

  get defaultRepetitionSchema(): RepetitionSchema {
    return this.repetitionSchemaOpts[0];
  }

  get generalOptions(): Options {
    return {
      autoSavingTimer: this.opts.autoSavingTimer
    };
  }

  get colors(): Color[] {
    return this.opts.colors;
  }

  private defaultColors = [
    {
      label: 'Blue',
      value: '#0072c3'
    },
    {
      label: 'Green',
      value: '#00d011'
    },
    {
      label: 'Yellow',
      value: '#ffe016'
    },
    {
      label: 'Red',
      value: '#da1e28'
    },
    {
      label: 'Purple',
      value: '#8a3ffc'
    },
    {
      label: 'Orange',
      value: '#ff7605'
    },
  ];

  // This default are merged with the already present ones
  // it is a shallow merge so be careful in using nested objects!
  private opts: FullSettings = {
    repetitionSchemaOpts: [
      {label: '1;7;30;90', value: '1;7;30;90'},
      {label: '1;5;15;30', value: '1;5;15;30'}
    ],
    autoSavingTimer: 15,
    currentVersion: Migrator.LATEST_VERSION,
    colors: this.defaultColors,
  };

  constructor(
    private apiService: ApiService
  ) {
  }

  loadOpts(): Observable<unknown> {
    return this.apiService.getSettings().pipe(tap(
      (opts) => {
        if (opts) {
          this.opts = opts;
          Migrator.setVersion(this.opts.currentVersion);
          if (!this.opts.currentVersion) {
            this.saveOpts();
          }
        } else {
          // it'll save the default options
          this.saveOpts();
        }
      }
    ));
  }

  saveOpts(subscriber?: Partial<Observer<any>>): void {
    this.opts.currentVersion = Migrator.getVersion();

    this.apiService.setSettings(this.opts).subscribe({
      next: resp => {
        console.log('opts saved', resp);
        subscriber?.next && subscriber.next(resp);
      },
      error: (error) => {
        console.error('opts not saved', error);
        subscriber?.error && subscriber.error(error);
      },
      complete: () => {
        subscriber?.complete && subscriber.complete();
      }
    });
  }

  saveGeneralOptions(opts: Options): boolean {
    const {autoSavingTimer} = opts;
    if (autoSavingTimer < 0) {
      console.error('Auto-saving timer: wrong value');
      return false;
    }
    this.opts.autoSavingTimer = autoSavingTimer;
    this.saveOpts();
    return true;
  }

  saveNewRepetitionSchema(repSchema: string): boolean {
    if (!this.repetitionSchemaOpts.find(rs => rs.value === repSchema)) {
      this.opts.repetitionSchemaOpts.push({
        value: repSchema,
        label: repSchema
      });
      this.saveOpts();
      return true;
    } else {
      return false;
    }
  }

  editRepetitionSchema(index: number, repSchema: string): boolean {
    if (!this.repetitionSchemaOpts.find(rs => rs.value === repSchema)) {
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
    this.opts.repetitionSchemaOpts = this.repetitionSchemaOpts.filter(rs => rs.value !== repSchema);
    this.saveOpts();
  }

  fifthMigration() {
    if (this.opts.colors) {
      return of(undefined);
    }
    this.opts.colors = this.defaultColors;
    this.saveOpts();
    return new Observable<undefined>(subscriber => {
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
    if (!this.colors.find(cl => cl.value === color.value)) {
      this.opts.colors.push({...color});
      this.saveOpts();
      return true;
    } else {
      return false;
    }
  }

  deleteColor(index: number) {
    const color = this.colors[index].value;
    this.opts.colors = this.colors.filter(cl => cl.value !== color);
    this.saveOpts();
  }
}
