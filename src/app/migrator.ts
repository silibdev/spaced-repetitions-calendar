import { first, from, map, mergeMap, Observable, of, reduce, switchMap, tap } from 'rxjs';
import { SpacedRepService } from './home/services/spaced-rep.service';

const CURRENT_VERSION_KEY = 'src-cv-k';

export class Migrator {
  private secondMigrationRun = false;
  private migrationApplied = false;

  static LATEST_VERSION = 4;

  constructor(
    private spacedRepsService: SpacedRepService
  ) {
  }

  static setVersion(newVersion: number | undefined): void {
    // From version 3+ we manage the saving of the version on remote too
    const version = newVersion || Migrator.getVersion() || 3;
    localStorage.setItem(CURRENT_VERSION_KEY, version.toString());
  }

  static getVersion(): number {
    return +(localStorage.getItem(CURRENT_VERSION_KEY) || 0);
  }

  migrate(): () => Observable<boolean> {
    this.migrationApplied = false;
    return () => of(undefined).pipe(
      switchMap(() => this.switchToFirstMigration()),
      switchMap(() => this.switchToSecondMigration()),
      switchMap(() => this.switchToThirdMigration()),
      switchMap(() => this.switchToFourthMigration()),
      switchMap(() => this.switchToFifthMigration()),
      map(() => this.migrationApplied)
    )
  }

  /**
   * Extract description from src-db
   */
  private switchToFirstMigration(): Observable<unknown> {
    if (Migrator.getVersion() >= 1) {
      return of(undefined);
    }
    this.migrationApplied = true;
    const eventsDone = new Set();
    return this.spacedRepsService.getAll().pipe(
      first(),
      switchMap(events => from(events)),
      mergeMap((event) => {
        const id = event.linkedSpacedRepId || event.id;
        if (id && !eventsDone.has(id)) {
          eventsDone.add(id);
          return this.spacedRepsService.saveFirstMigration(event);
        }
        return of(undefined);
      }),
      reduce((acc, _) => acc, undefined), // wait for all mergeMap to complete
      tap(() => Migrator.setVersion(1))
    );
  }

  /**
   * Extract shortDescription from src-db
   */
  private switchToSecondMigration(skipCheck?: boolean): Observable<unknown> {
    if (!skipCheck && Migrator.getVersion() >= 2) {
      return of(undefined);
    }
    this.migrationApplied = true;
    const eventsDone = new Set();
    return this.spacedRepsService.getAllSecondMigration().pipe(
      first(),
      switchMap(events => from(events)),
      switchMap(event => this.spacedRepsService.getSecondMigration(event.id as string)),
      mergeMap((event) => {
        const id = event.linkedSpacedRepId || event.id;
        if (id && !eventsDone.has(id)) {
          eventsDone.add(id);
          return this.spacedRepsService.saveSecondMigration(event);
        }
        return of(undefined);
      }),
      reduce((acc, _) => acc, undefined), // wait for all mergeMap to complete
      tap(() => {
        this.secondMigrationRun = true;
        Migrator.setVersion(2);
      })
    );
  }

  /**
   * Extract everything from db
   */
  private switchToThirdMigration(): Observable<unknown> {
    if (Migrator.getVersion() >= 3) {
      return of(undefined);
    }
    if (this.secondMigrationRun) {
      Migrator.setVersion(3);
      return of(undefined);
    }
    this.migrationApplied = true;
    return this.spacedRepsService.loadDbThirdMigration().pipe(
      switchMap(() => this.switchToSecondMigration(true)),
      switchMap(() => this.spacedRepsService.purgeDB()),
      tap(() => Migrator.setVersion(3))
    );
  }

  /**
   * Move 'done' to specific model from common
   * @private
   */
  private switchToFourthMigration(): Observable<unknown>{
    if (Migrator.getVersion() >= 4) {
      return of(undefined);
    }
    this.migrationApplied = true;
    return this.spacedRepsService.fourthMigration().pipe(
      tap(() => Migrator.setVersion(4))
    );
  }

  private switchToFifthMigration(): Observable<unknown> {
    if (Migrator.getVersion() >= 5) {
      return of(undefined);
    }
    this.migrationApplied = true;
    return this.spacedRepsService.fifthMigration().pipe(
      tap(() => Migrator.setVersion(5))
    );
  }
}
