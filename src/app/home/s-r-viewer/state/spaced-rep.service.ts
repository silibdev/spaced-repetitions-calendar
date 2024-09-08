import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service';
import {
  debounceTime,
  defaultIfEmpty,
  distinctUntilChanged,
  forkJoin,
  map,
  Observable,
  switchMap,
  tap,
} from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { SpacedRepRepository } from './spaced-rep.repository';
import { SRFilter, SRViewerUIRepository } from './s-r-viewer-ui.repository';
import {
  CreateSpacedReps,
  Photo,
  QNA,
  SpacedRepModel,
  SpecificSpacedRepModel,
} from '../../models/spaced-rep.model';
import { EventDetailService } from '../../services/event-detail.service';
import { addDays, isSameMonth } from 'date-fns';
import { DEFAULT_CATEGORY } from '../../models/settings.model';
import { Utils } from '../../../utils';
import { SettingsService } from './settings.service';
import { DescriptionsService } from '../../services/descriptions.service';
import { ConfirmationService } from 'primeng/api';
import { PhotoService } from '../../services/photo.service';
import { QNAService } from '../../services/q-n-a.service';

@UntilDestroy()
@Injectable({
  providedIn: 'root',
})
export class SpacedRepService {
  constructor(
    private apiService: ApiService,
    private srViewerUIService: SRViewerUIRepository,
    private srEventRepository: SpacedRepRepository,
    private eventDetailService: EventDetailService,
    private settingsService: SettingsService,
    private descriptionService: DescriptionsService,
    private photoService: PhotoService,
    private qnaService: QNAService,
  ) {
    this.srViewerUIService
      .getFilter()
      .pipe(
        untilDestroyed(this),
        debounceTime(250),
        distinctUntilChanged(({ date: aDate, ...a }, { date: bDate, ...b }) => {
          // Check if the rest is equal
          if (JSON.stringify(a) !== JSON.stringify(b)) {
            // if not, ok they are different for sure
            return false;
          }
          // otherwise the only difference could be the date
          // but in our case the date is different only if it refers
          // to a different month (the api returns the entire month data)
          return isSameMonth(aDate, bDate);
        }),
        switchMap((filter) => this.loadSREvents(filter)),
        tap((events) => this.srEventRepository.setEvents(events)),
      )
      .subscribe();
  }

  private loadSREvents(filter: SRFilter): Observable<SpacedRepModel[]> {
    return this.apiService.getEventList(filter.date, true).pipe(
      map((events) => {
        return (
          events?.map((e) => ({
            ...e,
            start: new Date(e.start),
          })) || []
        );
      }),
      switchMap((events) =>
        forkJoin(
          events.map((e) =>
            this.eventDetailService.get(e.linkedSpacedRepId || e.id).pipe(
              map((details) => ({
                ...details,
                ...e,
              })),
            ),
          ),
        ).pipe(defaultIfEmpty([])),
      ),
      map((events) => {
        const activeCategory = filter.activeCategory;
        return events.filter((e: SpacedRepModel) => {
          if (!e.category && activeCategory === DEFAULT_CATEGORY) {
            return true;
          }
          return e.category === activeCategory;
        });
      }),
    );
  }

  load() {}

  createCompleteSpacedRep(
    createSpacedRep: CreateSpacedReps,
    photos: Photo[],
    qnas: QNA[],
    qnasToDelete: QNA[],
    confirmationService: ConfirmationService,
  ) {
    return this.create(createSpacedRep).pipe(
      switchMap((masterEvent) =>
        forkJoin([
          this.photoService.savePhotos(
            masterEvent.id,
            photos,
            confirmationService,
          ),
          this.saveQNA(
            masterEvent.id,
            masterEvent.id,
            qnas,
            qnasToDelete,
            confirmationService,
          ),
        ]),
      ),
    );
  }

  private saveQNA(
    masterId: string,
    eventId: string,
    qnas: QNA[],
    qnasToDelete: QNA[],
    confirmationService: ConfirmationService,
  ) {
    return this.qnaService.save(
      masterId,
      eventId,
      qnas,
      qnasToDelete,
      confirmationService,
    );
  }

  create(
    createSpacedRep: CreateSpacedReps,
  ): Observable<SpecificSpacedRepModel> {
    const repSchema: number[] = createSpacedRep.repetitionSchema
      ? createSpacedRep.repetitionSchema.split(';').map((rep) => +rep)
      : [];

    this.settingsService.saveNewRepetitionSchema(
      createSpacedRep.repetitionSchema,
    );

    const id = Utils.generateRandomUUID();
    createSpacedRep.spacedRep.id = id;

    const specificSpacedRepModel: SpecificSpacedRepModel = {
      id,
      start: createSpacedRep.startDate,
      repetitionNumber: 0,
    };

    const newSpacedReps = [specificSpacedRepModel];

    repSchema.forEach((rep) => {
      const spacedRep: SpecificSpacedRepModel = {
        id: Utils.generateRandomUUID(),
        linkedSpacedRepId: specificSpacedRepModel.id,
        start: addDays(specificSpacedRepModel.start, rep),
        repetitionNumber: rep,
      };
      newSpacedReps.push(spacedRep);
    });

    const { description, ...commonSpacedRepModel } = createSpacedRep.spacedRep;

    return this.apiService.createRepeatedEvents(newSpacedReps).pipe(
      switchMap((newSpecificEvents) =>
        forkJoin([
          this.descriptionService.save(id, description || ''),
          this.eventDetailService.save(id, commonSpacedRepModel),
        ]).pipe(
          tap(() => {
            this.srEventRepository.addEvents(
              newSpecificEvents.map((specific) => ({
                ...commonSpacedRepModel,
                ...specific,
              })),
            );
          }),
        ),
      ),
      map(() => specificSpacedRepModel),
    );
  }
}
