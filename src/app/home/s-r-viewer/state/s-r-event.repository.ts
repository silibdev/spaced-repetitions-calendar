import { Injectable } from '@angular/core';
import { createStore } from '@ngneat/elf';
import { selectAllEntities, setEntities, withEntities } from '@ngneat/elf-entities';

export interface SREvent {
  id: string;
  linkedSpacedRepId?: string;
  repetitionNumber: number;
  start: Date;
  done?: boolean;
  title: string; //TODO COME LO PRENDO?
}

@Injectable({
  providedIn: "root"
})
export class SREventRepository {
  private static NAME = "s-r-event";

  private store = createStore({ name: SREventRepository.NAME }, withEntities<SREvent>());

  setList(events: SREvent[]) {
    this.store.update(setEntities(events));
  }

  getAll() {
    return this.store.pipe(selectAllEntities());
  }
}
