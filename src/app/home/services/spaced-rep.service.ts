import { Injectable } from '@angular/core';
import { CreateSpacedReps, SpacedRepModel } from '../models/spaced-rep.model';
import { BehaviorSubject, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { addDays } from 'date-fns';
import { EventFormService } from './event-form.service';

const DB_NAME = 'src-db';

@Injectable({
  providedIn: 'root'
})
export class SpacedRepService {
  private spacedReps = new BehaviorSubject<SpacedRepModel[]>([]);
  private spacedReps$: Observable<SpacedRepModel[]>;

  constructor(
    private eventFormService: EventFormService
  ) {
    const db = localStorage.getItem(DB_NAME);
    if (db) {
      const oldDb = JSON.parse(db);
      oldDb.forEach( (event: any) => event.start = new Date(event.start));
      this.spacedReps.next(oldDb)
    }

    this.spacedReps$ = this.spacedReps.pipe(
      tap( db => {
        const dbToSave = db.map( event => {
          const toDb: any = {
            ...event
          };
          toDb.start = toDb.start.toUTCString();
          return toDb;
        })
        localStorage.setItem(DB_NAME, JSON.stringify(dbToSave));
      }),
      shareReplay(1)
    )
  }

  create(createSpacedRep: CreateSpacedReps): Observable<void> {
    const repSchema: number[] = createSpacedRep.repetitionSchema.split(';').map( rep => +rep);

    this.eventFormService.saveNewRepetitionSchema(createSpacedRep.repetitionSchema);

    const firstSR: SpacedRepModel = {
      id: Math.random().toString(),
      title: createSpacedRep.spacedRep.title,
      description: createSpacedRep.spacedRep.description,
      start: createSpacedRep.startDate,
      color: createSpacedRep.spacedRep.color,
      allDay: true
    }

    const newSpacedReps = [firstSR];

    repSchema.forEach( (rep) => {
      const spacedRep: SpacedRepModel = {
        id: Math.random().toString(),
        title: firstSR.title,
        description: firstSR.description,
        linkedSpacedRepId: firstSR.id,
        start: addDays(firstSR.start, rep),
        color: firstSR.color,
        allDay: true
      }
      newSpacedReps.push(spacedRep);
    })

    const currentSR = this.spacedReps.value;

    this.spacedReps.next([...currentSR, ...newSpacedReps]);

    return of(undefined);
  }

  getAll(): Observable<SpacedRepModel[]> {
    return this.spacedReps$;
  }

  get(id: string): Observable<SpacedRepModel> {
    const event = this.spacedReps.value.find( sr => sr.id === id);
    if (event) {
      return of(event);
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

  save(eventToModify: SpacedRepModel | undefined): Observable<void> {
    const db = this.spacedReps.value;
    const index = db.findIndex(event => event.id === eventToModify?.id);
    if (index > -1) {
      const oldEvent = db[index];
      db[index] = {
        ...oldEvent,
        ...eventToModify
      };

      const masterId = eventToModify?.linkedSpacedRepId || eventToModify?.id;
      db.forEach( event => {
        if(event.linkedSpacedRepId === masterId || event.id === masterId) {
          event.color = eventToModify?.color;
          event.title = eventToModify?.title || '';
          event.description = eventToModify?.description || '';
        }
      })
    }
    this.spacedReps.next([...db]);

    return of(undefined);
  }
}
