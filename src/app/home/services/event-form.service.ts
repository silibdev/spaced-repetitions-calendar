import { Injectable } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators
} from '@angular/forms';
import { CreateSpacedReps, Photo, SpacedRepModel } from '../models/spaced-rep.model';
import { SettingsService } from './settings.service';
import { filter, Observable } from 'rxjs';
import { DEFAULT_CATEGORY } from '../models/settings.model';

@Injectable({
  providedIn: 'root'
})
export class EventFormService {
  form: UntypedFormGroup;
  private loaded = false;

  get photosControl(): FormArray | null {
    return this.form.get('photos') as FormArray;
  }

  constructor(
    fb: UntypedFormBuilder,
    private settingsService: SettingsService
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
      highlightTitle: [],
      category: [undefined, Validators.required],
      photos: fb.array([])
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
    this.photosControl?.clear();
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
      highlightTitle: false,
      category: this.settingsService.currentCategory,
      photos: []
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
        allDay: true,
        category: value.category
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
      category: value.category
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
    if (abstractControl instanceof UntypedFormGroup) {
      Object.values((abstractControl as UntypedFormGroup).controls)
        .forEach(control => this.markAllControlsAsDirty(control))
    } else if (abstractControl instanceof UntypedFormArray) {
      (abstractControl as UntypedFormArray).controls
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
        highlightTitle: event.highlightTitle,
        category: event.category || DEFAULT_CATEGORY
      });
      const photos = event.photos;
      this.loadPhotos(photos);

      this.loaded = true;
    }
  }

  loadPhotos(photos?: Photo[]) {
    this.photosControl?.clear();
    if (photos) {
      this.addPhotos(photos);
    }
  }


  addPhotos(photos: Photo[]) {
    photos.forEach(p =>
      this.photosControl?.push(new FormControl(p))
    )
  }

  onEditedSpacedRep(): Observable<SpacedRepModel> {
    return this.form.valueChanges.pipe(
      filter(() => this.loaded)
    );
  }

  removePhoto(photo: Photo) {
    const index = (this.photosControl?.value as Array<Photo>).findIndex(p => p === photo);
    if (index > -1) {
      this.photosControl?.removeAt(index);
    }
  }

  getPhotos(): Photo[] {
    return (this.photosControl?.value as Array<Photo>).map(p => ({
      id: p.id,
      thumbnail: p.id ? '' : p.thumbnail,
      name: p.name,
      toDelete: p.toDelete
    }))
  }
}
