import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateSpacedReps, SpacedRepModel } from '../models/spaced-rep.model';
import { FullSettings, Options, RepetitionSchema } from '../models/settings.model';
import { HttpClient } from '@angular/common/http';

const OPTS_DB_NAME = 'src-opts-db';

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
    private httpClient: HttpClient
  ) {
    this.loadOpts();
  }

  loadOpts(): void {
    this.httpClient.get<any>('/.netlify/functions/settings').subscribe(({data: optsString}) => {
      // const optsString = localStorage.getItem(OPTS_DB_NAME);
      const opts = optsString ? JSON.parse(optsString) : undefined;

      if (opts) {
        this.opts = {
          ...this.opts,
          ...opts
        };
      } else {
        this.saveOpts();
      }
    });
  }

  saveOpts(): void {
    localStorage.setItem(OPTS_DB_NAME, JSON.stringify(this.opts));
    this.httpClient.post('/.netlify/functions/settings', {data: JSON.stringify(this.opts)}).subscribe(resp => {
      console.log('opts saved', resp);
    })
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
      // could be an out of bound
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
