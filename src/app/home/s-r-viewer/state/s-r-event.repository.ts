import { Injectable } from '@angular/core';
import { createStore } from '@ngneat/elf';
import {
  selectAllEntities,
  selectManyByPredicate,
  setEntities,
  withEntities,
} from '@ngneat/elf-entities';
import {
  CommonSpacedRepModel,
  SpecificSpacedRepModel,
} from '../../models/spaced-rep.model';
import { shareReplay } from 'rxjs';

export type SREvent = CommonSpacedRepModel & SpecificSpacedRepModel;

const isMaster = (event: SREvent) => !event.linkedSpacedRepId;

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

  getAllFiltered(query: string) {
    const regex = new RegExp(query, 'i');
    return this.store.pipe(
      selectManyByPredicate(
        (event) =>
          isMaster(event) &&
          // Prevent possible errors, we don't trust the type so much
          (regex.test(event.title || '') ||
            regex.test(event.shortDescription || '')),
      ),
      shareReplay(1),
    );
  }

  getAllMaster() {
    return this.store.pipe(
      selectManyByPredicate((event) => isMaster(event)),
      shareReplay(1),
    );
  }
}
