import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { EventFormService } from '../services/event-form.service';
import { BlockableUI } from 'primeng/api';
import { Photo, SpacedRepModel } from '../models/spaced-rep.model';
import { UntypedFormControl } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { distinctUntilChanged, filter, Observable, startWith, tap } from 'rxjs';
import { SettingsService } from '../services/settings.service';
import { Color } from '../models/settings.model';
import { FileUpload } from 'primeng/fileupload';

interface FileSelectEvent {
  /**
   * Browser event.
   */
  originalEvent: Event;
  /**
   * Uploaded files.
   */
  files: File[];
  /**
   * All files to be uploaded.
   */
  currentFiles: File[];
}

type PhotoExt = Photo & {toDelete?: boolean};

@UntilDestroy()
@Component({
  selector: 'app-event-view',
  templateUrl: './event-view.component.html',
  styleUrls: ['./event-view.component.scss']
})
export class EventViewComponent implements OnInit, BlockableUI {
  @ViewChild('content') content?: ElementRef;
  isEdit = false;
  isMaster = false;

  private customColor = {
    label: 'Custom',
    value: 'custom'
  };

  colorOpts: Color[];

  customColorControl: UntypedFormControl;

  titleOptions$?: Observable<{ boldTitle?: boolean, highlightTitle?: boolean}>;

  @Input()
  set event(event: SpacedRepModel | undefined) {
    this.isEdit = !!event;
    this.isMaster = (event && !event.linkedSpacedRepId) || false;
    this.eventFormService.load(event);
  };

  constructor(
    public eventFormService: EventFormService,
    public settingsService: SettingsService
  ) {
    this.customColorControl = new UntypedFormControl();
    this.colorOpts = [
      ...this.settingsService.colors,
      this.customColor
    ];
  }

  ngOnInit(): void {
    const colorControl = this.eventFormService.form.get('color');
    if (colorControl) {
      if (!colorControl.value) {
        colorControl.setValue(this.colorOpts[0].value);
      }
      colorControl.valueChanges.pipe(
        untilDestroyed(this),
        distinctUntilChanged(),
        startWith(colorControl.value),
        tap((color: string) => {
          const colorOpt = this.colorOpts.find( c => c.value === color);
          if (colorOpt && colorOpt.label !== 'Custom') {
            this.customColorControl.setValue(colorOpt.value);
            this.eventFormService.disableColorControl();
          } else {
            let randomColor: string | undefined;
            while (!randomColor || this.colorOpts.find(c => c.value === randomColor) ) {
              randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
            }
            const colorToSet = color === 'custom' ? randomColor : color;
            this.customColor.value = colorToSet;
            this.customColorControl.setValue(colorToSet);
            this.eventFormService.enableColorControl();
          }
        })
      ).subscribe();

      this.customColorControl.valueChanges.pipe(
        untilDestroyed(this),
        distinctUntilChanged(),
        tap(newColor => {
          colorControl.setValue(newColor);
        })
      ).subscribe()
    }

    this.titleOptions$ = this.eventFormService.form.valueChanges.pipe(
      startWith(this.eventFormService.form.value)
    );

    const doneAudio = new Audio();
    doneAudio.src = "assets/sounds/done.mp3";
    doneAudio.load();

    const doneControl = this.eventFormService.form.get('done');
    doneControl?.valueChanges.pipe(
      untilDestroyed(this),
      filter((done: boolean) => done),
      tap(() => {
        doneAudio.pause();
        doneAudio.currentTime = 0;
        doneAudio.play();
      })
    ).subscribe()
  }

  getBlockableElement(): HTMLElement {
    return this.content?.nativeElement;
  }

  photosSelected(event: FileSelectEvent, uploader: FileUpload) {
    const photos: Photo[] = []
    event.currentFiles.forEach( f => {
      const url = URL.createObjectURL(f);
      photos.push({
        id: '',
        name: f.name,
        thumbnail: url
      });
    });
    this.eventFormService.addPhotos(photos);
    uploader.clear();
  }

  deletePhoto(photo: PhotoExt) {
    if (photo.id) {
      photo.toDelete = true;
      return;
    }
    this.eventFormService.removePhoto(photo);
  }

  restorePhoto(photo: PhotoExt) {
    photo.toDelete = false;
  }
}
