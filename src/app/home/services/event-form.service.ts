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
  private get photosControl(): FormArray {
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
      const photos = event.photos || [{
        id: '1',
        name: '1',
        thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAApgAAAKYB3X3/OAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVEiJtZZPbBtFFMZ/M7ubXdtdb1xSFyeilBapySVU8h8OoFaooFSqiihIVIpQBKci6KEg9Q6H9kovIHoCIVQJJCKE1ENFjnAgcaSGC6rEnxBwA04Tx43t2FnvDAfjkNibxgHxnWb2e/u992bee7tCa00YFsffekFY+nUzFtjW0LrvjRXrCDIAaPLlW0nHL0SsZtVoaF98mLrx3pdhOqLtYPHChahZcYYO7KvPFxvRl5XPp1sN3adWiD1ZAqD6XYK1b/dvE5IWryTt2udLFedwc1+9kLp+vbbpoDh+6TklxBeAi9TL0taeWpdmZzQDry0AcO+jQ12RyohqqoYoo8RDwJrU+qXkjWtfi8Xxt58BdQuwQs9qC/afLwCw8tnQbqYAPsgxE1S6F3EAIXux2oQFKm0ihMsOF71dHYx+f3NND68ghCu1YIoePPQN1pGRABkJ6Bus96CutRZMydTl+TvuiRW1m3n0eDl0vRPcEysqdXn+jsQPsrHMquGeXEaY4Yk4wxWcY5V/9scqOMOVUFthatyTy8QyqwZ+kDURKoMWxNKr2EeqVKcTNOajqKoBgOE28U4tdQl5p5bwCw7BWquaZSzAPlwjlithJtp3pTImSqQRrb2Z8PHGigD4RZuNX6JYj6wj7O4TFLbCO/Mn/m8R+h6rYSUb3ekokRY6f/YukArN979jcW+V/S8g0eT/N3VN3kTqWbQ428m9/8k0P/1aIhF36PccEl6EhOcAUCrXKZXXWS3XKd2vc/TRBG9O5ELC17MmWubD2nKhUKZa26Ba2+D3P+4/MNCFwg59oWVeYhkzgN/JDR8deKBoD7Y+ljEjGZ0sosXVTvbc6RHirr2reNy1OXd6pJsQ+gqjk8VWFYmHrwBzW/n+uMPFiRwHB2I7ih8ciHFxIkd/3Omk5tCDV1t+2nNu5sxxpDFNx+huNhVT3/zMDz8usXC3ddaHBj1GHj/As08fwTS7Kt1HBTmyN29vdwAw+/wbwLVOJ3uAD1wi/dUH7Qei66PfyuRj4Ik9is+hglfbkbfR3cnZm7chlUWLdwmprtCohX4HUtlOcQjLYCu+fzGJH2QRKvP3UNz8bWk1qMxjGTOMThZ3kvgLI5AzFfo379UAAAAASUVORK5CYII='
      }, {
        id: '2',
        name: '2',
        thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAApgAAAKYB3X3/OAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVEiJtZZPbBtFFMZ/M7ubXdtdb1xSFyeilBapySVU8h8OoFaooFSqiihIVIpQBKci6KEg9Q6H9kovIHoCIVQJJCKE1ENFjnAgcaSGC6rEnxBwA04Tx43t2FnvDAfjkNibxgHxnWb2e/u992bee7tCa00YFsffekFY+nUzFtjW0LrvjRXrCDIAaPLlW0nHL0SsZtVoaF98mLrx3pdhOqLtYPHChahZcYYO7KvPFxvRl5XPp1sN3adWiD1ZAqD6XYK1b/dvE5IWryTt2udLFedwc1+9kLp+vbbpoDh+6TklxBeAi9TL0taeWpdmZzQDry0AcO+jQ12RyohqqoYoo8RDwJrU+qXkjWtfi8Xxt58BdQuwQs9qC/afLwCw8tnQbqYAPsgxE1S6F3EAIXux2oQFKm0ihMsOF71dHYx+f3NND68ghCu1YIoePPQN1pGRABkJ6Bus96CutRZMydTl+TvuiRW1m3n0eDl0vRPcEysqdXn+jsQPsrHMquGeXEaY4Yk4wxWcY5V/9scqOMOVUFthatyTy8QyqwZ+kDURKoMWxNKr2EeqVKcTNOajqKoBgOE28U4tdQl5p5bwCw7BWquaZSzAPlwjlithJtp3pTImSqQRrb2Z8PHGigD4RZuNX6JYj6wj7O4TFLbCO/Mn/m8R+h6rYSUb3ekokRY6f/YukArN979jcW+V/S8g0eT/N3VN3kTqWbQ428m9/8k0P/1aIhF36PccEl6EhOcAUCrXKZXXWS3XKd2vc/TRBG9O5ELC17MmWubD2nKhUKZa26Ba2+D3P+4/MNCFwg59oWVeYhkzgN/JDR8deKBoD7Y+ljEjGZ0sosXVTvbc6RHirr2reNy1OXd6pJsQ+gqjk8VWFYmHrwBzW/n+uMPFiRwHB2I7ih8ciHFxIkd/3Omk5tCDV1t+2nNu5sxxpDFNx+huNhVT3/zMDz8usXC3ddaHBj1GHj/As08fwTS7Kt1HBTmyN29vdwAw+/wbwLVOJ3uAD1wi/dUH7Qei66PfyuRj4Ik9is+hglfbkbfR3cnZm7chlUWLdwmprtCohX4HUtlOcQjLYCu+fzGJH2QRKvP3UNz8bWk1qMxjGTOMThZ3kvgLI5AzFfo379UAAAAASUVORK5CYII='
      }];
      this.addPhotos(photos);

      this.loaded = true;
    }
  }

  addPhotos(photos: Photo[]) {
    photos.forEach( p => {
      this.photosControl.push(new FormControl(p));
    });
  }

  onEditedSpacedRep(): Observable<SpacedRepModel> {
    return this.form.valueChanges.pipe(
      filter(() => this.loaded)
    );
  }

  removePhoto(photo: Photo) {
    const index = (this.photosControl.value as Array<Photo>).findIndex(p => p === photo);
    if (index > -1) {
      this.photosControl.removeAt(index);
    }
  }

  getPhotos(): Photo[] {
    return (this.photosControl.value as Array<Photo>).map(p => ({
      id: p.id,
      thumbnail: p.id ? '' : p.thumbnail,
      name: p.name
    }))
  }
}
