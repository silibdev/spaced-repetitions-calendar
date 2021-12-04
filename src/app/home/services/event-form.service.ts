import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateSpacedReps, SpacedRepModel } from '../models/spaced-rep.model';

const OPTS_DB_NAME = 'src-opts-db';

@Injectable({
  providedIn: 'root'
})
export class EventFormService {
  get repetitionSchemaOpts(): { label: string, value: string }[] {
    return this.opts.repetitionSchemaOpts;
  }

  form: FormGroup;
  private opts: {
    repetitionSchemaOpts: { label: string, value: string }[]
  } = {
    repetitionSchemaOpts: [
      {label: '1;7;30;90', value: '1;7;30;90'},
      {label: '1;5;15;30', value: '1;5;15;30'}
    ]
  };

  constructor(
    fb: FormBuilder
  ) {
    this.loadOpts();

    this.form = fb.group({
      title: [undefined, Validators.required],
      description: [undefined, Validators.required],
      repetitionSchema: [undefined, Validators.required],
      linkedSpacedRepId: [],
      id: [],
      allDay: [],
      start: [undefined, Validators.required],
      color: [{value: undefined, disabled: true}, Validators.required]
    })
    this.reset();
  }

  loadOpts(): void {
    const optsString = localStorage.getItem(OPTS_DB_NAME);
    const opts = optsString ? JSON.parse(optsString) : undefined;

    if (opts) {
      this.opts = opts;
    } else {
      this.saveOpts();
    }
  }

  saveOpts(): void {
    localStorage.setItem(OPTS_DB_NAME, JSON.stringify(this.opts));
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

  enableColorControl(): void {
    this.form.get('color')?.enable()
  }

  disableColorControl(): void {
    this.form.get('color')?.disable()
  }


  reset(): void {
    this.form.setValue({
      repetitionSchema: this.repetitionSchemaOpts[0].value,
      start: new Date(),
      color: '',
      title: '',
      description: '',
      linkedSpacedRepId: '',
      id: '',
      allDay: true
    })
  }

  getCreateSpacedRep(): CreateSpacedReps {
    const value = this.form.getRawValue()
    return {
      spacedRep: {
        title: value.title,
        description: value.description,
        color: {
          primary: value.color,
          secondary: 'white'
        }
      },
      repetitionSchema: value.repetitionSchema,
      startDate: value.start
    }
  }

  getEditedSpacedRep(): SpacedRepModel {
    const value = this.form.getRawValue();
    return {
      title: value.title,
      description: value.description,
      start: value.start,
      id: value.id,
      linkedSpacedRepId: value.linkedSpacedRepId,
      color: {
        primary: value.color,
        secondary: 'white'
      },
      allDay: value.allDay
    }
  }

  isValid(): boolean {
    if (this.form.valid) {
      return true;
    }

    this.markAllControlsAsDirty(this.form);
    return false;
  }

  private markAllControlsAsDirty(abstractControl: AbstractControl): void {
    abstractControl.markAsDirty({onlySelf: true});
    if (abstractControl instanceof FormGroup) {
      Object.values((abstractControl as FormGroup).controls)
        .forEach(control => this.markAllControlsAsDirty(control))
    } else if (abstractControl instanceof FormArray) {
      (abstractControl as FormArray).controls
        .forEach(control => this.markAllControlsAsDirty(control))
    }
  }

  load(event?: SpacedRepModel) {
    if (!event) {
      this.reset();
    } else {
      this.form.patchValue({
        title: event.title,
        description: event.description,
        id: event.id,
        start: event.start,
        color: event.color?.primary,
        linkedSpacedRepId: event.linkedSpacedRepId,
        allDay: event.allDay
      });
    }
  }
}
