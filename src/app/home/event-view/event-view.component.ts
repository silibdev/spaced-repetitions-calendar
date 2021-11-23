import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { EventFormService } from '../services/event-form.service';
import { BlockableUI } from 'primeng/api';
import { SpacedRepModel } from '../models/spaced-rep.model';

@Component({
  selector: 'app-event-view',
  templateUrl: './event-view.component.html',
  styleUrls: ['./event-view.component.scss']
})
export class EventViewComponent implements OnInit, BlockableUI {
  @ViewChild('content') content?: ElementRef;
  isEdit = false;
  isMaster = false;

  @Input()
  set event(event: SpacedRepModel | undefined) {
    this.isEdit = !!event;
    this.isMaster = (event && !event.linkedSpacedRepId) || false;
    this.eventFormService.load(event);
  };

  constructor(
    public eventFormService: EventFormService
  ) {
  }

  ngOnInit(): void {
  }

  getBlockableElement(): HTMLElement {
    return this.content?.nativeElement;
  }
}
