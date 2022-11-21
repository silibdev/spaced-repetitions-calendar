import { Injectable } from '@angular/core';
import {
  CommonSpacedRepModel,
  CreateSpacedReps,
  SpacedRepModel,
  SpecificSpacedRepModel
} from '../models/spaced-rep.model';
import {
  BehaviorSubject,
  defaultIfEmpty,
  forkJoin,
  map,
  mapTo,
  Observable,
  of,
  switchMap,
  tap,
  throwError
} from 'rxjs';
import { addDays } from 'date-fns';
import { EventFormService } from './event-form.service';
import { DescriptionsService } from './descriptions.service';
import { EventDetailService } from './event-detail.service';
import LZString from 'lz-string';
import { SettingsService } from './settings.service';
import { ApiService } from './api.service';


@Injectable({
  providedIn: 'root'
})
export class SpacedRepService {
  private spacedReps = new BehaviorSubject<SpecificSpacedRepModel[]>([]);
  private readonly spacedReps$: Observable<SpecificSpacedRepModel[]>;
  private remoteSaveTimer?: number;

  private get db(): SpecificSpacedRepModel[] {
    return this.spacedReps.value;
  }

  private setDb(newDb: SpecificSpacedRepModel[], remoteSave?: boolean) {
    const dbToSave = newDb.map(event => {
      const toDb: any = {
        ...event
      };
      toDb.start = toDb.start.toISOString();
      return toDb;
    });
    if (this.remoteSaveTimer) {
      clearTimeout(this.remoteSaveTimer);
    }
    this.remoteSaveTimer = setTimeout(() => {
      const newDb = LZString.compressToUTF16(JSON.stringify(dbToSave));
      if (remoteSave) {
        this.apiService.setEventList(newDb).subscribe(() => console.log('save db done!'));
      }
    }, 250);
    this.spacedReps.next(newDb);
  }

  constructor(
    private eventFormService: EventFormService,
    private settingsService: SettingsService,
    private descriptionService: DescriptionsService,
    private eventDetailService: EventDetailService,
    private apiService: ApiService
  ) {
    this.spacedReps$ = this.spacedReps.asObservable();
  }

  sync(): Observable<unknown> {
    return this.apiService.sync().pipe(
      switchMap(() =>
        forkJoin([
          this.loadDb(),
          this.settingsService.loadOpts()
        ])
      )
    );
  }

  private loadDb(): Observable<unknown> {
    return this.apiService.getEventList().pipe(tap(savedDb => {
      let db = [];
      if (savedDb) {
        try {
          db = JSON.parse(savedDb);
        } catch (e) {
          db = JSON.parse(LZString.decompressFromUTF16(savedDb) || '[]');
        }
      }
      db.forEach((event: any) => event.start = new Date(event.start));
      this.setDb(db);
    }));
  }

  create(createSpacedRep: CreateSpacedReps): Observable<void> {
    const repSchema: number[] = createSpacedRep.repetitionSchema.split(';').map(rep => +rep);

    this.settingsService.saveNewRepetitionSchema(createSpacedRep.repetitionSchema);

    const id = Math.random().toString();
    createSpacedRep.spacedRep.id = id;

    const specificSpacedRepModel: SpecificSpacedRepModel = {
      id,
      start: createSpacedRep.startDate,
      repetitionNumber: 0
    }

    const newSpacedReps = [specificSpacedRepModel];

    repSchema.forEach((rep) => {
      const spacedRep: SpecificSpacedRepModel = {
        id: Math.random().toString(),
        linkedSpacedRepId: specificSpacedRepModel.id,
        start: addDays(specificSpacedRepModel.start, rep),
        repetitionNumber: rep
      }
      newSpacedReps.push(spacedRep);
    })

    const currentSR = this.db;

    const {description, ...commonSpacedRepModel} = createSpacedRep.spacedRep;

    return forkJoin([
      this.descriptionService.save(id, description || ''),
      this.eventDetailService.save(id, commonSpacedRepModel)
    ]).pipe(
      mapTo(undefined),
      tap(() => this.setDb([...currentSR, ...newSpacedReps], true))
    );
  }

  getAll(): Observable<SpacedRepModel[]> {
    return this.spacedReps$.pipe(
      switchMap(events => forkJoin(
        events.map(e => this.eventDetailService.get(e.linkedSpacedRepId || e.id).pipe(
          map(details => ({
            ...details,
            ...e
          }))
        ))
      ).pipe(defaultIfEmpty([])))
    );
  }

  getAllSecondMigration(): Observable<SpacedRepModel[]> {
    return (this.spacedReps$ as Observable<any[]>).pipe(
      switchMap(events => forkJoin(
        events.map(e => this.apiService.getSecondMigrationEventDetail((e.linkedSpacedRepId || e.id) as string).pipe(
          map(sd => ({
            ...e,
            shortDescription: sd
          }))
        ))
      ).pipe(defaultIfEmpty([])))
    );
  }

  getSecondMigration(id: string): Observable<SpacedRepModel> {
    const event = this.db.find(sr => sr.id === id) as any;
    if (event) {
      const descId = event.linkedSpacedRepId || event.id;
      return forkJoin([
        of(event),
        this.descriptionService.get(descId as string),
        this.apiService.getSecondMigrationEventDetail(descId as string)
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

  get(id: string): Observable<SpacedRepModel> {
    const event = this.db.find(sr => sr.id === id);
    if (event) {
      const descId = event.linkedSpacedRepId || event.id;
      return forkJoin([
        of(event),
        this.descriptionService.get(descId as string),
        this.eventDetailService.get(descId as string)
      ]).pipe(map(([srm, description, details]) => {
        return {
          ...srm,
          ...details,
          description
        };
      }));
    }
    return throwError(() => 'Error');
  }

  deleteEvent(event: SpacedRepModel | undefined): Observable<void> {
    if (!event) {
      return of(undefined);
    }
    const eventsToRemove = [event.id as string];
    const newDb = this.db.filter(e => {
        if (event.linkedSpacedRepId === event.id) {
          eventsToRemove.push(e.id as string);
        }
        return !(e.id === event.id || e.linkedSpacedRepId === event.id);
      }
    );
    this.setDb(newDb, true);
    return forkJoin(eventsToRemove.map(id => ([
      this.eventDetailService.delete(id),
      this.descriptionService.delete(id)
    ])).flat()).pipe(mapTo(undefined));
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

      (db as any[]).forEach(event => {
        if (event.linkedSpacedRepId === masterId || event.id === masterId) {
          event.color = eventToModify.color;
          event.title = eventToModify.title || '';
          event.description = eventToModify.description;
          event.shortDescription = eventToModify.shortDescription;
          event.boldTitle = eventToModify.boldTitle;
          event.highlightTitle = eventToModify.highlightTitle;
        }
      })

      this.setDb([...db]);

      return this.descriptionService.save(masterId as string, description)
        .pipe(mapTo(undefined));
    } else {
      return of(undefined);
    }
  }

  save(eventToModify: SpacedRepModel): Observable<void> {
    const commonSpacedRepModel: CommonSpacedRepModel = {
      id: eventToModify.id,
      allDay: eventToModify.allDay,
      done: eventToModify.done,
      shortDescription: eventToModify.shortDescription,
      boldTitle: eventToModify.boldTitle,
      highlightTitle: eventToModify.highlightTitle,
      color: eventToModify.color,
      title: eventToModify.title
    };

    return forkJoin([
      this.descriptionService.save(eventToModify.id, eventToModify.description || ''),
      this.eventDetailService.save(eventToModify.id, commonSpacedRepModel)
    ])
      .pipe(mapTo(undefined));
  }

  purgeDB(): Observable<unknown> {
    this.setDb(this.db.map(e => ({
      id: e.id,
      linkedSpacedRepId: e.linkedSpacedRepId,
      repetitionNumber: e.repetitionNumber,
      start: e.start
    })), true);
    const ids = new Set(this.db.map(e => e.id));
    return forkJoin([
      this.apiService.purgeDescriptions(ids),
      this.apiService.purgeDetails(ids)
    ]);
  }

  search(query: string): Observable<SpacedRepModel[]> {
    const regex = new RegExp(query, 'i');
    return forkJoin(this.db
      .filter(sr => !sr.linkedSpacedRepId)
      .map(sr =>
        forkJoin([
          this.descriptionService.get(sr.id as string),
          this.eventDetailService.get(sr.id as string)
        ])
          .pipe(
            map(([description, details]) => ({
                ...sr,
                ...details,
                description
              })
            )
          )
      )
    ).pipe(
      defaultIfEmpty([]),
      map(srs => srs.filter(sr =>
        sr.title.match(regex)
        || sr.shortDescription?.match(regex)
        || sr.description?.match(regex)
      ))
    );
  }

  desync() {
    return this.apiService.desync();
  }
}
