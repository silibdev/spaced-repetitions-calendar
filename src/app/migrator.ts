import { APP_INITIALIZER, FactoryProvider } from '@angular/core';
import { first, from, mergeMap, Observable, of, reduce, switchMap, tap } from 'rxjs';
import { SpacedRepService } from './home/services/spaced-rep.service';

const CURRENT_VERSION_KEY = 'src-cv-k';

class Migrator {
  private secondMigrationRun = false;

  constructor(
    private spacedRepsService: SpacedRepService
  ) {
  }

  setVersion(version: number): void {
    localStorage.setItem(CURRENT_VERSION_KEY, version.toString());
  }

  getVersion(): number {
    return +(localStorage.getItem(CURRENT_VERSION_KEY) || 0);
  }

  migrate(): () => Observable<unknown> {
    return () => of(undefined).pipe(
      switchMap(() => this.switchToFirstMigration()),
      switchMap(() => this.switchToSecondMigration()),
      switchMap(() => this.switchToThirdMigration())
    )
  }

  /**
   * Extract description from src-db
   */
  switchToFirstMigration(): Observable<unknown> {
    if (this.getVersion() >= 1) {
      return of(undefined);
    }
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
      tap(() => this.setVersion(1))
    );
  }

  /**
   * Extract shortDescription from src-db
   */
  switchToSecondMigration(skipCheck?: boolean): Observable<unknown> {
    if (!skipCheck && this.getVersion() >= 2) {
      return of(undefined);
    }
    const eventsDone = new Set();
    return this.spacedRepsService.getAllSecondMigration().pipe(
      first(),
      switchMap(events => from(events)),
      switchMap(event => this.spacedRepsService.getSecondMigration(event.id as string)),
      mergeMap((event) => {
        const id = event.linkedSpacedRepId || event.id;
        if (id && !eventsDone.has(id)) {
          eventsDone.add(id);
          return this.spacedRepsService.save(event);
        }
        return of(undefined);
      }),
      reduce((acc, _) => acc, undefined), // wait for all mergeMap to complete
      tap(() => {
        this.secondMigrationRun = true;
        this.setVersion(2);
      })
    );
  }

  /**
   * Extract everything from db
   */
  switchToThirdMigration(): Observable<unknown> {
    if (this.getVersion() >= 3) {
      return of(undefined);
    }
    if (this.secondMigrationRun) {
      this.setVersion(3);
      return of(undefined);
    }
    return this.switchToSecondMigration(true).pipe(
      switchMap(() => this.spacedRepsService.purgeDB()),
      tap(() => this.setVersion(3))
    );
  }
}

export const DB_MIGRATOR_PROVIDER: FactoryProvider = {
  multi: true,
  provide: APP_INITIALIZER,
  useFactory: (srs: SpacedRepService) => new Migrator(srs).migrate(),
  deps: [SpacedRepService]
}
