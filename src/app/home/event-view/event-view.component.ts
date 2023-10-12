import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChildren
} from '@angular/core';
import { EventFormService } from '../services/event-form.service';
import { BlockableUI } from 'primeng/api';
import { Photo, SpacedRepModel } from '../models/spaced-rep.model';
import { UntypedFormControl } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { distinctUntilChanged, filter, Observable, startWith, tap } from 'rxjs';
import { SettingsService } from '../services/settings.service';
import { Color } from '../models/settings.model';
import { FileUpload } from 'primeng/fileupload';
import { Image } from 'primeng/image';
import { SpacedRepService } from '../services/spaced-rep.service';
import { ApiService } from '../services/api.service';
import { Utils } from '../../utils';

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

type PhotoExt = Photo & { editing?: boolean, oldName?: string };

@UntilDestroy()
@Component({
  selector: 'app-event-view',
  templateUrl: './event-view.component.html',
  styleUrls: ['./event-view.component.scss']
})
export class EventViewComponent implements OnInit, BlockableUI {
  maxFileUpload = ApiService.MAX_FILE_UPLOAD;
  isEdit = false;
  isMaster = false;

  private customColor = {
    label: 'Custom',
    value: 'custom'
  };

  colorOpts: Color[];

  customColorControl: UntypedFormControl;

  titleOptions$?: Observable<{ boldTitle?: boolean, highlightTitle?: boolean }>;

  rotationClass = 0;

  @ViewChildren(Image)
  set imageComponents(ics: QueryList<Image>) {
    if (ics) {
      ics.forEach(im => {
        // @ts-ignore
        im.zoomSettings = {
          default: 1,
          step: 0.1,
          max: 4,
          min: 0.5
        };

        // pathing methods
        const oldRotateLeft = im.rotateLeft.bind(im);
        im.rotateLeft = () => {
          oldRotateLeft();
          this.setRotation(im.rotate);
        };
        const oldRotateRight = im.rotateRight.bind(im);
        im.rotateRight = () => {
          oldRotateRight();
          this.setRotation(im.rotate);
        };
        const oldClosePreview = im.closePreview.bind(im);
        im.closePreview = () => {
          oldClosePreview();
          this.setRotation(0);
        };
      });
    }
  }

  private _event?: SpacedRepModel;

  @Input()
  set event(event: SpacedRepModel | undefined) {
    this.isEdit = !!event;
    this.isMaster = (event && !event.linkedSpacedRepId) || false;
    this.eventFormService.load(event);
    this._event = event;
  };

  get event(): SpacedRepModel | undefined {
    return this._event;
  }

  @Output()
  reloadPhotos = new EventEmitter<{ event: SpacedRepModel, callback: (photos?: Photo[]) => void }>();

  constructor(
    public eventFormService: EventFormService,
    public settingsService: SettingsService,
    private srService: SpacedRepService,
    private cd: ChangeDetectorRef,
    private elRef: ElementRef
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
          const colorOpt = this.colorOpts.find(c => c.value === color);
          if (colorOpt && colorOpt.label !== 'Custom') {
            this.customColorControl.setValue(colorOpt.value);
            this.eventFormService.disableColorControl();
          } else {
            let randomColor: string | undefined;
            while (!randomColor || this.colorOpts.find(c => c.value === randomColor)) {
              randomColor = Utils.generateRandomColor();
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
        Utils.playAudio(doneAudio);
      })
    ).subscribe()
  }

  getBlockableElement(): HTMLElement {
    return this.elRef?.nativeElement;
  }

  addPhotos(event: FileSelectEvent, uploader: FileUpload) {
    const photos: Photo[] = []
    event.currentFiles.forEach(f => {
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

  renamePhoto(photo: PhotoExt) {
    photo.oldName = photo.name;
    photo.editing = true;
  }

  confirmRenamePhoto(photo: PhotoExt) {
    photo.oldName = undefined;
    photo.editing = false;
  }

  cancelRenamePhoto(photo: PhotoExt) {
    photo.name = photo.oldName || '';
    photo.oldName = undefined;
    photo.editing = false;
  }

  onImageShow(image: Image, photo: PhotoExt) {
    if (!photo.id) {
      // La immagini senza id, quelle da aggiungere non hanno una vera thumbnail
      return;
    }
    this.srService.getPhotoUrl(this.event!, photo.id).subscribe(
      url => {
        image.src = url;
        this.cd.detectChanges();

        const htmlImage = document.querySelector<HTMLImageElement>('img.p-image-preview');
        if (htmlImage) {
          htmlImage.src = url;
        }
      }
    );
  }

  onImageHide(image: Image, photo: PhotoExt) {
    image.src = (photo.id ? 'data:image/jpeg;base64,' : '') + photo.thumbnail;
    this.cd.detectChanges();
  }

  reloadPhotosClick() {
    if (this.event) {
      this.reloadPhotos.emit({
        event: this.event,
        callback: (photos) => {
          this.eventFormService.loadPhotos(photos);
          if (this.event) {
            this.event.photos = photos
          }
        }
      });
    }
  }

  // Quill focus trap doesn't seem to work properly anymore
  // this is a workaround
  keyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.stopPropagation();
    }
  }

  private setRotation(rotation: number) {
    this.rotationClass = rotation % 360;
    if (this.rotationClass < 0) {
      this.rotationClass += 360;
    }
    console.log(this.rotationClass);
  }
}
