import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SpacedRepService } from '../services/spaced-rep.service';
import { map, Observable } from 'rxjs';
import { SpacedRepModel } from '../models/spaced-rep.model';


@Component({
  selector: 'app-list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss']
})
export class ListViewComponent implements OnInit {
  spacedReps$: Observable<SpacedRepModel[]>;
  possibleColors$: Observable<{ value: string, label: string }[]>;

  @Output()
  eventClicked = new EventEmitter<SpacedRepModel>();

  constructor(
    private srService: SpacedRepService
  ) {
    this.spacedReps$ = this.srService.getAll().pipe(
      map(spacedResp => spacedResp.filter(sr => !sr.linkedSpacedRepId))
    );

    this.possibleColors$ = this.spacedReps$.pipe(
      map(srs => Array.from(
        new Set(srs
          .map(sr => sr.color?.primary)
          .filter(color => !!color))).map((color) => ({label: color, value: color})) as any
      )
    );
  }

  myFilter(filt: any, value: any): void {
    console.log('filtering', value);
    filt && filt(value);
  }

  ngOnInit(): void {
  }

}
