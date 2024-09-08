import { Injectable } from '@angular/core';
import { createStore } from '@ngneat/elf';
import {
  addEntities,
  selectAllEntities,
  selectEntityByPredicate,
  setEntities,
  withEntities,
} from '@ngneat/elf-entities';
import {
  CommonSpacedRepModel,
  SpacedRepModel,
  SpecificSpacedRepModel,
} from '../../models/spaced-rep.model';
import {
  combineLatest,
  defaultIfEmpty,
  map,
  Observable,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';

export type SREvent = CommonSpacedRepModel & SpecificSpacedRepModel;

const isMaster = (event: SREvent) => !event.linkedSpacedRepId;

@Injectable({
  providedIn: 'root',
})
export class SpacedRepRepository {
  private static NAME = 's-r-event';

  private commonSRStore = createStore(
    { name: SpacedRepRepository.NAME },
    withEntities<CommonSpacedRepModel>(),
  );

  private specificSRStore = createStore(
    { name: SpacedRepRepository.NAME },
    withEntities<SpecificSpacedRepModel>(),
  );

  private descriptionSRStore = createStore(
    { name: SpacedRepRepository.NAME },
    withEntities<{ id: string; description: string }>(),
  );

  private extractCommonAndSpecific(event: SREvent) {
    const masterId =
      'linkedSpacedRepId' in event
        ? event.linkedSpacedRepId || event.id
        : event.id;
    const common: CommonSpacedRepModel = {
      id: masterId,
      allDay: event.allDay,
      shortDescription: event.shortDescription,
      boldTitle: event.boldTitle,
      highlightTitle: event.highlightTitle,
      color: event.color,
      title: event.title,
      category: event.category,
    };
    const specific: SpecificSpacedRepModel = {
      linkedSpacedRepId: event.linkedSpacedRepId,
      id: event.id,
      done: event.done,
      start: event.start,
      repetitionNumber: event.repetitionNumber,
    };
    return { common, specific };
  }

  private decomposeSREventList(events: SREvent[]) {
    const commonsEvents: CommonSpacedRepModel[] = [];
    const specificEvents: SpecificSpacedRepModel[] = [];
    events.forEach((event) => {
      const { common, specific } = this.extractCommonAndSpecific(event);
      commonsEvents.push(common);
      specificEvents.push(specific);
    });
    return { commonsEvents, specificEvents };
  }

  getAll(): Observable<SpacedRepModel[]> {
    return this.specificSRStore.pipe(
      selectAllEntities(),
      switchMap((specificSRs) => {
        const masterIds = new Set<string>();
        specificSRs.forEach((ssr) =>
          masterIds.add(ssr.linkedSpacedRepId || ssr.id),
        );

        const commonSRMap: Record<string, CommonSpacedRepModel> = {};
        return combineLatest(
          [...masterIds].map((m) =>
            this.getCommonSR(m).pipe(
              tap((commonSR) => {
                if (commonSR) {
                  commonSRMap[commonSR.id] = commonSR;
                }
              }),
            ),
          ),
        ).pipe(
          defaultIfEmpty([]),
          map(() =>
            specificSRs.map((ssr) => {
              const common = commonSRMap[ssr.linkedSpacedRepId || ssr.id];
              return {
                ...common,
                ...ssr,
              };
            }),
          ),
        );
      }),
      shareReplay(1),
    );
  }

  getCommonSR(id: string) {
    return this.commonSRStore.pipe(
      selectEntityByPredicate((csr) => csr.id === id),
    );
  }

  setEvents(events: SpacedRepModel[]) {
    const { commonsEvents, specificEvents } = this.decomposeSREventList(events);
    this.commonSRStore.update(setEntities(commonsEvents));
    this.specificSRStore.update(setEntities(specificEvents));
  }

  addEvents(events: SREvent[]) {
    const { commonsEvents, specificEvents } = this.decomposeSREventList(events);
    this.commonSRStore.update(addEntities(commonsEvents));
    this.specificSRStore.update(addEntities(specificEvents));
  }

  getAllFiltered(query: string) {
    const regex = new RegExp(query, 'i');
    return this.getAll().pipe(
      map((events) =>
        events.filter(
          (event) =>
            isMaster(event) &&
            // Prevent possible errors, we don't trust the type so much
            (regex.test(event.title || '') ||
              regex.test(event.shortDescription || '')),
        ),
      ),
      shareReplay(1),
    );
  }

  getAllMaster() {
    return this.getAll().pipe(
      map((events) => events.filter((event) => isMaster(event))),
      shareReplay(1),
    );
  }
}
