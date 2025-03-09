import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service';
import {
  debounceTime,
  defaultIfEmpty,
  distinctUntilChanged,
  filter,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { SpacedRepRepository, SREvent } from './spaced-rep.repository';
import { SRFilter, SRViewerUIRepository } from './s-r-viewer-ui.repository';
import {
  CreateSpacedReps,
  extractCommonModel,
  Photo,
  QNA,
  SpacedRepModel,
  SpecificSpacedRepModel,
} from '../../models/spaced-rep.model';
import { EventDetailService } from '../../services/event-detail.service';
import { addDays } from 'date-fns';
import { DEFAULT_CATEGORY } from '../../models/settings.model';
import { Utils } from '../../../utils';
import { SettingsService } from './settings.service';
import { DescriptionsService } from '../../services/descriptions.service';
import { ConfirmationService } from 'primeng/api';
import { PhotoService } from '../../services/photo.service';
import { QNAService } from '../../services/q-n-a.service';
import { EffectFn } from '@ngneat/effects-ng';

@UntilDestroy()
@Injectable({
  providedIn: 'root',
})
export class SpacedRepService extends EffectFn {
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
    super();
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
          // return isSameMonth(aDate, bDate);
          return true; // Check only the rest, not the date
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

  load() {
    // It's fake, it actually starts loading from constructor when a filter arrives
  }

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
      tap((newSpecificEvents) =>
        newSpecificEvents.forEach((e) => (e.start = new Date(e.start))),
      ),
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
                description,
              })),
            );
          }),
        ),
      ),
      map(() => specificSpacedRepModel),
    );
  }

  loadEventToEdit = this.createEffectFn((sr$: Observable<SREvent | null>) =>
    sr$.pipe(
      filter((sr): sr is SREvent => !!sr),
      switchMap((srEvent) => {
        const id = srEvent.linkedSpacedRepId || srEvent.id;
        return this.apiService.getEventDescription(id).pipe(
          tap((description) => {
            this.srEventRepository.setDescription(id, description);
            this.srEventRepository.selectEditEvent(id);
          }),
        );
      }),
    ),
  );

  private internalDeleteEvent = this.createEffectFn(
    (srEvent$: Observable<SpacedRepModel | undefined>) =>
      srEvent$.pipe(
        switchMap((srEvent) => {
          if (!srEvent) {
            return of(null);
          }
          const isMaster = !srEvent.linkedSpacedRepId;
          const deleteCalls = [this.apiService.deleteRepeatedEvent(srEvent.id)];
          if (isMaster) {
            const photos = (srEvent.photos || [])
              .filter((p) => !!p.id)
              .map((p) => {
                p.toDelete = true;
                return p;
              });
            deleteCalls.push(
              this.eventDetailService.delete(srEvent.id),
              this.descriptionService.delete(srEvent.id),
              this.photoService.savePhotos(
                extractCommonModel(srEvent).masterId,
                photos,
              ),
            );
          }
          return forkJoin(deleteCalls).pipe(
            tap(() => {
              this.srEventRepository.resetEditEvent();
              this.srEventRepository.deleteEvents(srEvent.id);
            }),
          );
        }),
      ),
  );

  deleteEditEvent = this.createEffectFn(
    (
      params$: Observable<{
        srEvent: SpacedRepModel | undefined;
        cs: ConfirmationService;
      }>,
    ) =>
      params$.pipe(
        tap(({ srEvent, cs }) => {
          const eventToModify = this.srEventRepository.currentEditEvent();
          const isMasterMessage = !eventToModify?.linkedSpacedRepId
            ? ' (Deleting this will delete the whole series!)'
            : '';
          cs.confirm({
            message:
              'Are you sure do you want to delete this repetition?' +
              isMasterMessage,
            accept: () => this.internalDeleteEvent(srEvent),
          });
        }),
      ),
  );

  updateSREvent = this.createEffectFn(
    (
      params$: Observable<{
        srModel: SpacedRepModel;
        qnas: QNA[];
        qnasToDelete: QNA[];
        onDone: () => void;
        cs: ConfirmationService;
      }>,
    ) =>
      params$.pipe(
        switchMap(({ srModel, qnas, qnasToDelete, onDone, cs }) => {
          const { masterId, common } = extractCommonModel(srModel);

          return forkJoin([
            this.descriptionService.save(masterId, srModel.description || ''),
            this.eventDetailService.save(masterId, common),
            srModel.photos
              ? this.photoService.savePhotos(masterId, srModel.photos, cs)
              : of(null),
            this.qnaService.save(masterId, srModel.id, qnas, qnasToDelete, cs),
          ]).pipe(
            tap(() => onDone()),
            tap(() => this.srEventRepository.update(srModel)),
          );
        }),
      ),
  );
}
