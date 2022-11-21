import { Injectable } from '@angular/core';
import { FullSettings, Options, RepetitionSchema } from '../models/settings.model';
import { ApiService } from './api.service';
import { Observable, tap } from 'rxjs';


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

  // This default are merged with the already present ones
  // it is a shallow merge so be careful in using nested objects!
  private opts: FullSettings = {
    repetitionSchemaOpts: [
      {label: '1;7;30;90', value: '1;7;30;90'},
      {label: '1;5;15;30', value: '1;5;15;30'}
    ],
    autoSavingTimer: 15
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
        } else {
          // it'll save the default options
          this.saveOpts();
        }
      }
    ));
  }

  saveOpts(): void {
    this.apiService.setSettings(this.opts).subscribe({
      next: resp => {
        console.log('opts saved', resp);
      },
      error: (error) => {
        console.error('opts not saved', error);
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
      } else {
        this.saveNewRepetitionSchema(repSchema);
      }
      return true;
    } else {
      return false;
    }
  }

  deleteRepetitionSchema(index: number): void {
    const repSchema = this.repetitionSchemaOpts[index].value;
    this.opts.repetitionSchemaOpts = this.repetitionSchemaOpts.filter(rs => rs.value !== repSchema);
    this.saveOpts();
  }
}
