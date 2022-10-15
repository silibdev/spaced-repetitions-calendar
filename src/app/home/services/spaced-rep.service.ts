import { Injectable } from '@angular/core';
import { CreateSpacedReps, SpacedRepModel } from '../models/spaced-rep.model';
import {
  BehaviorSubject,
  defaultIfEmpty,
  forkJoin,
  map,
  mapTo,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError
} from 'rxjs';
import { addDays } from 'date-fns';
import { EventFormService } from './event-form.service';
import { DescriptionsService } from './descriptions.service';
import { ShortDescriptionsService } from './short-descriptions.service';
import LZString from 'lz-string';

export const DB_NAME = 'src-db';

@Injectable({
  providedIn: 'root'
})
export class SpacedRepService {
  private spacedReps = new BehaviorSubject<SpacedRepModel[]>([]);
  private readonly spacedReps$: Observable<SpacedRepModel[]>;
  private _db: SpacedRepModel[] = [];
  private get db(): SpacedRepModel[] {
    return this._db;
  }

  private set db(newDb: SpacedRepModel[]) {
    this._db = newDb;
    this.spacedReps.next(newDb);
  }

  constructor(
    private eventFormService: EventFormService,
    private descriptionService: DescriptionsService,
    private shortDescriptionService: ShortDescriptionsService
  ) {
    const db = localStorage.getItem(DB_NAME);
    if (db) {
      let oldDb;
      try {
        oldDb = JSON.parse(db);
      } catch (e) {
        oldDb = JSON.parse(LZString.decompressFromUTF16(db) || '[]');
      }
      oldDb.forEach((event: any) => event.start = new Date(event.start));
      this.db = oldDb;
    }

    let timer: number;
    this.spacedReps$ = this.spacedReps.pipe(
      tap(db => {
        const dbToSave = db.map(event => {
          const toDb: any = {
            ...event
          };
          toDb.start = toDb.start.toISOString();
          return toDb;
        })
        if (timer) {
          clearTimeout(timer);
        }
        timer = setTimeout(() => {
          const newDb = LZString.compressToUTF16(JSON.stringify(dbToSave));
          localStorage.setItem(DB_NAME, newDb)
        }, 250);
      }),
      shareReplay(1)
    )
  }

  create(createSpacedRep: CreateSpacedReps): Observable<void> {
    const repSchema: number[] = createSpacedRep.repetitionSchema.split(';').map(rep => +rep);

    this.eventFormService.saveNewRepetitionSchema(createSpacedRep.repetitionSchema);

    const id = Math.random().toString();
    const firstSR: SpacedRepModel = {
      id,
      title: createSpacedRep.spacedRep.title,
      start: createSpacedRep.startDate,
      color: createSpacedRep.spacedRep.color,
      allDay: true,
      done: false,
      shortDescription: '',
      repetitionNumber: 0,
      boldTitle: createSpacedRep.spacedRep.boldTitle,
      highlightTitle: createSpacedRep.spacedRep.highlightTitle
    }

    const newSpacedReps = [firstSR];

    repSchema.forEach((rep) => {
      const spacedRep: SpacedRepModel = {
        ...firstSR,
        id: Math.random().toString(),
        linkedSpacedRepId: firstSR.id,
        start: addDays(firstSR.start, rep),
        repetitionNumber: rep
      }
      newSpacedReps.push(spacedRep);
    })

    const currentSR = this.db;

    this.db = [...currentSR, ...newSpacedReps];

    return forkJoin([
      of(undefined),
      this.descriptionService.save(id, createSpacedRep.spacedRep.description as string),
      this.shortDescriptionService.save(id, createSpacedRep.spacedRep.shortDescription)
    ]).pipe(
      mapTo(undefined)
    );
  }

  getAll(): Observable<SpacedRepModel[]> {
    return this.spacedReps$.pipe(
      switchMap(events => forkJoin(
        events.map(e => this.shortDescriptionService.get((e.linkedSpacedRepId || e.id) as string).pipe(
          map(sd => ({
            ...e,
            shortDescription: sd
          }))
        ))
      ).pipe(defaultIfEmpty([])))
    );
  }

  get(id: string): Observable<SpacedRepModel> {
    const event = this.db.find(sr => sr.id === id);
    if (event) {
      const descId = event.linkedSpacedRepId || event.id;
      return forkJoin([
        of(event),
        this.descriptionService.get(descId as string),
        this.shortDescriptionService.get(descId as string)
      ]).pipe(map(([srm, description, shortDescription]) => {
        return {
          ...srm,
          description,
          shortDescription: srm.shortDescription || shortDescription
        };
      }));
    }
    return throwError(() => 'Error');
  }

  deleteEvent(event: SpacedRepModel | undefined): Observable<void> {
    if (event) {
      const newDb = this.db.filter(e => {
        let toRemove = e.id !== event.id;
        if (!event.linkedSpacedRepId && toRemove) {
          return e.linkedSpacedRepId !== event.id;
        }
        return toRemove;
      });
      this.db = newDb;
    }
    return of(undefined);
  }

  saveFirstMigration(eventToModify: SpacedRepModel): Observable<void> {
    const db = this.db;
    const index = db.findIndex(event => event.id === eventToModify.id);
    if (index > -1) {
      const oldEvent = db[index];
      db[index] = {
        ...oldEvent,
        ...eventToModify
      };

      const masterId = eventToModify.linkedSpacedRepId || eventToModify.id;
      const description = eventToModify.description || '';
      eventToModify.description = undefined;

      db.forEach(event => {
        if (event.linkedSpacedRepId === masterId || event.id === masterId) {
          event.color = eventToModify.color;
          event.title = eventToModify.title || '';
          event.description = eventToModify.description;
          event.shortDescription = eventToModify.shortDescription;
          event.boldTitle = eventToModify.boldTitle;
          event.highlightTitle = eventToModify.highlightTitle;
        }
      })

      this.db = [...db];

      return this.descriptionService.save(masterId as string, description)
        .pipe(mapTo(undefined));
    } else {
      return of(undefined);
    }
  }

  save(eventToModify: SpacedRepModel): Observable<void> {
    const db = this.db;
    const index = db.findIndex(event => event.id === eventToModify.id);
    if (index > -1) {
      const oldEvent = db[index];
      db[index] = {
        ...oldEvent,
        ...eventToModify
      };

      const masterId = eventToModify.linkedSpacedRepId || eventToModify.id;
      const description = eventToModify.description || '';
      eventToModify.description = undefined;
      const shortDescription = eventToModify.shortDescription || '';
      eventToModify.shortDescription = '';

      db.forEach(event => {
        if (event.linkedSpacedRepId === masterId || event.id === masterId) {
          event.color = eventToModify.color;
          event.title = eventToModify.title || '';
          event.description = eventToModify.description;
          event.shortDescription = eventToModify.shortDescription;
          event.boldTitle = eventToModify.boldTitle;
          event.highlightTitle = eventToModify.highlightTitle;
        }
      })

      this.db = [...db];

      return forkJoin([
        this.descriptionService.save(masterId as string, description),
        this.shortDescriptionService.save(masterId as string, shortDescription)
      ])
        .pipe(mapTo(undefined));
    } else {
      return of(undefined);
    }
  }

  search(query: string): Observable<SpacedRepModel[]> {
    const regex = new RegExp(query, 'i');
    return forkJoin(this.db
      .map(sr =>
        forkJoin([
          this.descriptionService.get(sr.id as string),
          this.shortDescriptionService.get(sr.id as string)
        ])
          .pipe(
            map(([description, shortDescription]) => ({
                ...sr,
                description,
                shortDescription
              })
            )
          )
      )
    ).pipe(
      map(srs => srs.filter(sr =>
        sr.title.match(regex)
        || sr.shortDescription?.match(regex)
        || sr.description?.match(regex)
      ))
    );
  }
}
