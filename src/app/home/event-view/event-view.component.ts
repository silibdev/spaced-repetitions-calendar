import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { EventFormService } from '../services/event-form.service';
import { BlockableUI } from 'primeng/api';
import { SpacedRepModel } from '../models/spaced-rep.model';
import { UntypedFormControl } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { distinctUntilChanged, Observable, startWith, tap } from 'rxjs';
import { SettingsService } from '../services/settings.service';
import { Color } from '../models/settings.model';

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
    value: '#ffffff'
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
        tap(color => {
          const colorOpt = this.colorOpts.find( c => c.value === color);
          if (colorOpt && colorOpt.label !== 'Custom') {
            this.customColorControl.setValue(colorOpt.value);
            this.eventFormService.disableColorControl();
          } else {
            this.customColor.value = color;
            this.customColorControl.setValue(color);
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
  }

  getBlockableElement(): HTMLElement {
    return this.content?.nativeElement;
  }
}
