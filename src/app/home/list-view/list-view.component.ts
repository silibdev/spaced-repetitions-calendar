import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SpacedRepService } from '../services/spaced-rep.service';
import { map, Observable } from 'rxjs';
import { SpacedRepModel } from '../models/spaced-rep.model';
import { SettingsService } from '../services/settings.service';


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
    private srService: SpacedRepService,
    private settingsService: SettingsService
  ) {
    this.spacedReps$ = this.srService.getAll().pipe(
      map(spacedResp => spacedResp.filter(sr => !sr.linkedSpacedRepId))
    );

    const colorNameMap: Record<string, string> = this.settingsService.colors.reduce((acc, color) => {
      acc[color.value] = color.label;
      return acc;
    }, {} as Record<string, string>);

    function isString(v: string | undefined): v is string {
      return !!v;
    }

    this.possibleColors$ = this.spacedReps$.pipe(
      map(srs => Array.from(
          new Set<string>(srs
            .map(sr => sr.color?.primary)
            .filter(isString))
        ).map((color) => ({label: colorNameMap[color] || color, value: color})) as any
      )
    );
  }

  myFilter(filt: any, value: any): void {
    filt && filt(value);
  }

  ngOnInit(): void {
  }

}
