import { Injectable } from '@angular/core';
import {
  CommonSpacedRepModel,
  CreateSpacedReps,
  SpacedRepModel,
  SpecificSpacedRepModel
} from '../models/spaced-rep.model';
import {
  BehaviorSubject,
  combineLatestWith,
  defaultIfEmpty,
  first,
  forkJoin,
  map,
  mapTo,
  Observable,
  of,
  ReplaySubject,
  switchMap,
  tap,
  throwError,
  withLatestFrom
} from 'rxjs';
import { addDays, isAfter, isEqual } from 'date-fns';
import { EventFormService } from './event-form.service';
import { DescriptionsService } from './descriptions.service';
import { EventDetailService } from './event-detail.service';
import LZString from 'lz-string';
import { SettingsService } from './settings.service';
import { ApiService } from './api.service';
import { Migrator } from '../../migrator';
import * as LZUTF8 from 'lzutf8';
import { DEFAULT_CATEGORY } from '../models/settings.model';


@Injectable({
  providedIn: 'root'
})
export class SpacedRepService {
  private spacedReps = new BehaviorSubject<SpecificSpacedRepModel[]>([]);
  private readonly spacedReps$: Observable<SpecificSpacedRepModel[]>;
  private remoteSaveTimer?: number;
  private category = new ReplaySubject<string>(1);

  private get db(): SpecificSpacedRepModel[] {
    return this.spacedReps.value;
  }

  private setDb(newDb: SpecificSpacedRepModel[], remoteSave?: boolean) {
    if (remoteSave) {
      const dbToSave = newDb.map(event => {
        const toDb: any = {...event};
        toDb.start = toDb.start.toISOString();
        return toDb;
      });
      if (this.remoteSaveTimer) {
        clearTimeout(this.remoteSaveTimer);
      }
      this.remoteSaveTimer = setTimeout(() => {
        const newCompressedDb = LZUTF8.compress(JSON.stringify(dbToSave), {outputEncoding: 'Base64'});
        this.apiService.setEventList(newCompressedDb).subscribe();
      }, 250);
    }
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
      switchMap(() => this.settingsService.loadOpts()),
      tap(() => this.category.next(this.settingsService.currentCategory)),
      switchMap(() => this.loadDb()
      )
    );
  }

  syncLocal(): Observable<unknown> {
    return this.settingsService.loadOpts().pipe(
      switchMap(() => this.loadDb(true)),
      switchMap(() => this.getAll(true).pipe(first())),
      switchMap(events => forkJoin(
        events
          .filter(e => !e.linkedSpacedRepId)
          .map(e =>
            this.get(e.id).pipe(
              switchMap(eventFull => this.save(eventFull))
            )
          )
      ).pipe(defaultIfEmpty(undefined)))
    );
  }

  private loadDb(forceSave?: boolean): Observable<unknown> {
    return this.apiService.getEventList().pipe(
      tap((savedDb) => {
        let db: any = [];
        if (savedDb) {
          try {
            db = JSON.parse(savedDb);
          } catch (e) {
            try {
              db = JSON.parse(LZUTF8.decompress(savedDb, {outputEncoding: 'String', inputEncoding: 'Base64'}));
            } catch (e) {
              db = JSON.parse(LZString.decompressFromUTF16(savedDb) || '[]');
            }
          }
        }
        db.forEach((event: any) => event.start = new Date(event.start));
        this.setDb(db, forceSave);
      }),
      withLatestFrom(this.spacedReps$),
      switchMap(() => new Migrator(this).migrate()()),
      tap(migrationApplied => migrationApplied && this.settingsService.saveOpts()),
      switchMap(() => this.getAll(true).pipe(first())),
      switchMap(db => forkJoin(
        db.map(e => this.descriptionService.get(e.linkedSpacedRepId || e.id))
      ).pipe(defaultIfEmpty(undefined)))
    );
  }

  public loadDbThirdMigration(): Observable<unknown> {
    const savedDb = localStorage.getItem('src-db') || '';
    let db;
    try {
      db = JSON.parse(savedDb);
    } catch (e) {
      db = JSON.parse(LZString.decompressFromUTF16(savedDb) || '[]');
    }
    db.forEach((event: any) => event.start = new Date(event.start));
    this.setDb(db);
    return of(undefined);
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

  changeCategory(category: string) {
    this.settingsService.changeCurrentCategory(category);
    this.category.next(category);
  }

  getAll(noCategoryFilter?: boolean): Observable<SpacedRepModel[]> {
    return this.spacedReps$.pipe(
      combineLatestWith(this.category),
      switchMap(([events, category]) => forkJoin(
          events
            .map(e => this.eventDetailService.get(e.linkedSpacedRepId || e.id).pipe(
              map(details => ({
                ...details,
                ...e
              }))
            ))
        ).pipe(defaultIfEmpty([]),
          map(spacedReps =>
            spacedReps.filter((e: SpacedRepModel) => {
              if (noCategoryFilter) {
                return true;
              }
              if (!e.category && category === DEFAULT_CATEGORY) {
                return true;
              }
              return e.category === category;
            })))
      )
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
          ...details,
          ...srm,
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
    const isMaster = !event.linkedSpacedRepId;
    const newDb = this.db.filter(e => !(e.id === event.id || (isMaster && e.linkedSpacedRepId === event.id)));
    this.setDb(newDb, true);
    if (isMaster) {
      return forkJoin([
        this.eventDetailService.delete(event.id),
        this.descriptionService.delete(event.id)
      ]).pipe(mapTo(undefined));
    }
    return this.spacedReps$.pipe(mapTo(undefined), first());
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

  saveSecondMigration(eventToModify: SpacedRepModel): Observable<void> {
    const currentEventIndex = this.db.findIndex(e => eventToModify.id === e.id);
    const currentEvent = this.db[currentEventIndex];
    if (!isEqual(currentEvent?.start, eventToModify.start)) {
      currentEvent.start = eventToModify.start;
      this.setDb(this.db);
    }

    const commonSpacedRepModel: any = {
      id: eventToModify.id,
      allDay: eventToModify.allDay,
      done: eventToModify.done,
      shortDescription: eventToModify.shortDescription,
      boldTitle: eventToModify.boldTitle,
      highlightTitle: eventToModify.highlightTitle,
      color: eventToModify.color,
      title: eventToModify.title
    };

    this.setDb(this.db, false);

    const masterId = eventToModify.linkedSpacedRepId || eventToModify.id;
    return forkJoin([
      this.descriptionService.save(masterId, eventToModify.description || ''),
      this.eventDetailService.save(masterId, commonSpacedRepModel)
    ])
      .pipe(mapTo(undefined));
  }

  save(eventToModify: SpacedRepModel): Observable<void> {
    const currentEventIndex = this.db.findIndex(e => eventToModify.id === e.id);
    const currentEvent = this.db[currentEventIndex];
    let specificIsChanged = false;
    if (!isEqual(currentEvent?.start, eventToModify.start)) {
      currentEvent.start = eventToModify.start;
      specificIsChanged = true;
    }
    if (currentEvent.done !== eventToModify.done) {
      currentEvent.done = eventToModify.done;
      specificIsChanged = true;
    }

    const {masterId, common} = this.extractCommonModel(eventToModify);

    return forkJoin([
      this.descriptionService.save(masterId, eventToModify.description || ''),
      this.eventDetailService.save(masterId, common)
    ])
      .pipe(
        tap(() => this.setDb(this.db, specificIsChanged)),
        mapTo(undefined)
      );
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

  private extractCommonModel(sr: SpacedRepModel): {masterId: string, common: CommonSpacedRepModel} {
    const masterId = sr.linkedSpacedRepId || sr.id;
    const common: CommonSpacedRepModel = {
      id: masterId,
      allDay: sr.allDay,
      shortDescription: sr.shortDescription,
      boldTitle: sr.boldTitle,
      highlightTitle: sr.highlightTitle,
      color: sr.color,
      title: sr.title,
      category: sr.category
    };
    return {masterId, common};
  }

  desyncLocal() {
    return this.apiService.desyncLocal();
  }

  deleteAllData(): Observable<unknown> {
    return this.apiService.deleteAllData().pipe(
      switchMap(() => this.desyncLocal())
    );
  }

  isSomethingPresent(): boolean {
    return this.apiService.isSomethingPresent();
  }

  syncPendingChanges(): Observable<number> {
    return this.apiService.syncPendingChanges();
  }

  fourthMigration(): Observable<unknown> {
    const today = new Date();
    return this.getAll(true).pipe(
      first(),
      switchMap(spacedReps => {
        const alreadyProcessed = new Set<string>();
        return forkJoin(
          spacedReps.map(sr => {
            if (sr.done) {
              sr.done = isAfter(sr.start, today) ? false : true;

              // UPDATE SPECIFIC MODEL IF NEEDED
              const currentEventIndex = this.db.findIndex(e => sr.id === e.id);
              const currentEvent = this.db[currentEventIndex];
              if (currentEvent.done !== sr.done) {
                currentEvent.done = sr.done;
                this.setDb(this.db, true);
              }

              // UPDATE COMMON MODEL
              const {masterId, common} = this.extractCommonModel(sr);
              if (!alreadyProcessed.has(masterId)) {
                alreadyProcessed.add(masterId);
                return this.apiService.setEventDetail(masterId, common);
              } else {
                return undefined;
              }
            }
            return undefined;
          }).filter(el => !!el)
        ).pipe(defaultIfEmpty(undefined))
      })
    );
  }

  fifthMigration() {
    return this.settingsService.fifthMigration();
  }

  sixthMigration() {
    return this.settingsService.sixthMigration();
  }
}
