import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { SettingsRepository } from './settings.repository';
import { switchMap, tap } from 'rxjs';
import { Migrator } from '../../../migrator';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FullSettings } from '../../models/settings.model';

@UntilDestroy()
@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  constructor(
    private settingsRepository: SettingsRepository,
    private apiService: ApiService,
  ) {
    this.settingsRepository
      .getSaveEvent()
      .pipe(
        untilDestroyed(this),
        switchMap(() => this.saveOpts(this.settingsRepository.settings)),
      )
      .subscribe();
  }

  loadOpts() {
    return this.apiService.getSettings().pipe(
      tap((opts) => {
        if (opts) {
          Migrator.setVersion(opts.currentVersion);
          if (!opts.currentVersion) {
            opts.currentVersion = Migrator.getVersion();
          }
          this.settingsRepository.setSettings(opts, { emitEvent: false });
        } else {
          // it'll save the default options
          this.saveOpts(this.settingsRepository.settings);
        }
      }),
    );
  }

  private saveOpts(opts: FullSettings) {
    console.log('saving', opts);
    return this.apiService.setSettings(opts);
  }
}
