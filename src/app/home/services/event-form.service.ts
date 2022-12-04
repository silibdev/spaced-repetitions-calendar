import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateSpacedReps, SpacedRepModel } from '../models/spaced-rep.model';
import { SettingsService } from './settings.service';
import { filter, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventFormService {
  form: FormGroup;
  private loaded = false;

  constructor(
    fb: FormBuilder,
    private settingsService: SettingsService,
  ) {
    this.form = fb.group({
      title: [undefined, Validators.required],
      description: [undefined],
      shortDescription: [undefined, Validators.required],
      repetitionSchema: [undefined, Validators.required],
      linkedSpacedRepId: [],
      id: [],
      allDay: [],
      start: [undefined, Validators.required],
      color: [{value: undefined, disabled: true}, Validators.required],
      done: [],
      repetitionNumber: [],
      boldTitle: [],
      highlightTitle: []
    })
    this.reset();
  }

  enableColorControl(): void {
    this.form.get('color')?.enable();
  }

  disableColorControl(): void {
    this.form.get('color')?.disable();
  }

  reset(): void {
    this.form.setValue({
      repetitionSchema: this.settingsService.defaultRepetitionSchema.value,
      start: new Date(),
      color: '',
      title: '',
      description: '',
      linkedSpacedRepId: '',
      id: '',
      allDay: true,
      done: false,
      shortDescription: '',
      repetitionNumber: null,
      boldTitle: false,
      highlightTitle: false
    });
    this.loaded = false;
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
        },
        shortDescription: value.shortDescription,
        boldTitle: value.boldTitle,
        highlightTitle: value.highlightTitle,
        id: '',
        done: false,
        allDay: true
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
      shortDescription: value.shortDescription,
      start: value.start,
      id: value.id,
      linkedSpacedRepId: value.linkedSpacedRepId,
      color: {
        primary: value.color,
        secondary: 'white'
      },
      allDay: value.allDay,
      done: value.done,
      repetitionNumber: value.repetitionNumber,
      boldTitle: value.boldTitle,
      highlightTitle: value.highlightTitle,
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
        shortDescription: event.shortDescription,
        id: event.id,
        start: event.start,
        color: event.color?.primary,
        linkedSpacedRepId: event.linkedSpacedRepId,
        allDay: event.allDay,
        done: event.done,
        repetitionNumber: event.repetitionNumber,
        boldTitle: event.boldTitle,
        highlightTitle: event.highlightTitle
      });
      this.loaded = true;
    }
  }

  onEditedSpacedRep(): Observable<SpacedRepModel> {
    return this.form.valueChanges.pipe(
      filter(() => this.loaded)
    );
  }
}
