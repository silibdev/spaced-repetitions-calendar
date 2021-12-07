import { Injectable } from '@angular/core';
import { CreateSpacedReps, SpacedRepModel } from '../models/spaced-rep.model';
import { BehaviorSubject, forkJoin, map, mapTo, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { addDays } from 'date-fns';
import { EventFormService } from './event-form.service';
import { DescriptionsService } from './descriptions.service';

export const DB_NAME = 'src-db';

@Injectable({
  providedIn: 'root'
})
export class SpacedRepService {
  private spacedReps = new BehaviorSubject<SpacedRepModel[]>([]);
  private spacedReps$: Observable<SpacedRepModel[]>;

  constructor(
    private eventFormService: EventFormService,
    private descriptionService: DescriptionsService
  ) {
    const db = localStorage.getItem(DB_NAME);
    if (db) {
      const oldDb = JSON.parse(db);
      oldDb.forEach((event: any) => event.start = new Date(event.start));
      this.spacedReps.next(oldDb)
    }

    this.spacedReps$ = this.spacedReps.pipe(
      tap(db => {
        const dbToSave = db.map(event => {
          const toDb: any = {
            ...event
          };
          toDb.start = toDb.start.toISOString();
          return toDb;
        })
        localStorage.setItem(DB_NAME, JSON.stringify(dbToSave));
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
      shortDescription: createSpacedRep.spacedRep.shortDescription,
      repetitionNumber: 0
    }

    const newSpacedReps = [firstSR];

    repSchema.forEach((rep) => {
      const spacedRep: SpacedRepModel = {
        id: Math.random().toString(),
        title: firstSR.title,
        linkedSpacedRepId: firstSR.id,
        start: addDays(firstSR.start, rep),
        color: firstSR.color,
        allDay: true,
        done: false,
        shortDescription: firstSR.shortDescription,
        repetitionNumber: rep
      }
      newSpacedReps.push(spacedRep);
    })

    const currentSR = this.spacedReps.value;

    this.spacedReps.next([...currentSR, ...newSpacedReps]);

    return forkJoin([
      of(undefined),
      this.descriptionService.save(id, createSpacedRep.spacedRep.description as string)
    ]).pipe(
      mapTo(undefined)
    );
  }

  getAll(): Observable<SpacedRepModel[]> {
    return this.spacedReps$;
  }

  get(id: string): Observable<SpacedRepModel> {
    const event = this.spacedReps.value.find(sr => sr.id === id);
    if (event) {
      const descId = event.linkedSpacedRepId || event.id;
      return forkJoin([
        of(event),
        this.descriptionService.get(descId as string)
      ]).pipe(map(([srm, description]) => {
        srm.description = description;
        return srm;
      }));
    }
    return throwError(() => 'Error');
  }

  deleteEvent(event: SpacedRepModel | undefined): Observable<void> {
    if (event) {
      const newDb = this.spacedReps.value.filter(e => {
        let toRemove = e.id !== event.id;
        if (!event.linkedSpacedRepId && toRemove) {
          return e.linkedSpacedRepId !== event.id;
        }
        return toRemove;
      });
      this.spacedReps.next(newDb);
    }
    return of(undefined);
  }

  save(eventToModify: SpacedRepModel): Observable<void> {
    const db = this.spacedReps.value;
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
        }
      })

      this.spacedReps.next([...db]);

      return this.descriptionService.save(masterId as string, description)
        .pipe(mapTo(undefined));
    } else {
      return of(undefined);
    }
  }
}
