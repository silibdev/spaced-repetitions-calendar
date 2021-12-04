import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateSpacedReps, SpacedRepModel } from '../models/spaced-rep.model';

@Injectable({
  providedIn: 'root'
})
export class EventFormService {
  repetitionSchemaOpts: { label: string, value: string }[] = [
    {label: '1;7;30;90', value: '1;7;30;90'},
    {label: '1;5;15;30', value: '1;5;15;30'}
  ]

  form: FormGroup;

  constructor(
    fb: FormBuilder
  ) {
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
      startDate: value.start,
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
