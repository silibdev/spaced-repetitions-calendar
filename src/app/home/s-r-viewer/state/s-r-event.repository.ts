import { Injectable } from '@angular/core';
import { createStore } from '@ngneat/elf';
import {
  selectAllEntities,
  setEntities,
  withEntities,
} from '@ngneat/elf-entities';
import {
  CommonSpacedRepModel,
  SpecificSpacedRepModel,
} from '../../models/spaced-rep.model';
import { shareReplay } from 'rxjs';

export type SREvent = CommonSpacedRepModel & SpecificSpacedRepModel;

@Injectable({
  providedIn: 'root',
})
export class SREventRepository {
  private static NAME = 's-r-event';

  private store = createStore(
    { name: SREventRepository.NAME },
    withEntities<SREvent>(),
  );

  getAll() {
    return this.store.pipe(selectAllEntities(), shareReplay(1));
  }

  setList(events: SREvent[]) {
    this.store.update(setEntities(events));
  }
}
