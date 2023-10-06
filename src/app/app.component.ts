import { Component } from '@angular/core';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { AuthService } from './home/services/auth.service';
import {
  combineLatest,
  debounce,
  debounceTime,
  delay,
  filter,
  map,
  Observable,
  of,
  pairwise,
  shareReplay,
  switchMap,
  tap,
  timer
} from 'rxjs';
import { User } from './home/models/settings.model';
import { ApiService } from './home/services/api.service';
import { SpacedRepService } from './home/services/spaced-rep.service';
import { LoaderService } from './home/services/loader.service';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [ConfirmationService, MessageService]
})
export class AppComponent {
  private menu: MenuItem[] = [
    {
      label: 'Home',
      routerLink: '/'
    },
    {
      label: 'Settings',
      items: [
        {
          label: 'General',
          routerLink: 'settings/general'
        },
        {
          label: 'Repetition schemas',
          routerLink: 'settings/rep-schemas'
        },
        {
          label: 'Manage categories',
          routerLink: 'settings/categories'
        },
        {
          label: 'Manage colors',
          routerLink: 'settings/colors'
        },
        {
          label: 'Import/Export',
          routerLink: 'settings/import-export'
        }
      ]
    },
    {
      label: 'About',
      routerLink: 'about'
    }
  ];

  user$: Observable<User | undefined>;
  menu$: Observable<MenuItem[]>;
  userMenu$: Observable<MenuItem[]>;
  pendingChanges$: Observable<string>;
  loadingValuePerc$: Observable<string>;
  loaderAsset$: Observable<string>;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private spacedRepService: SpacedRepService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    public loaderService: LoaderService,
    private swUpdate: SwUpdate
  ) {
    this.loaderAsset$ = this.authService.getUser$().pipe(
      map(user => user?.name.startsWith('Altea')),
      map( isAlty => isAlty ? 'love-loader.svg' : 'loader.svg')
    );

    this.swUpdate.versionUpdates.pipe(
      tap(updateEvent => {
        switch (updateEvent.type) {
          case 'VERSION_DETECTED':
            this.confirmationService.confirm({
              header: 'New version is available!',
              message: 'Wait for the download and update :)',
              rejectVisible: false,
              accept: () => this.loaderService.startLoading()
            });
            break;
          case 'VERSION_READY':
            this.loaderService.stopLoading();
            this.confirmationService.confirm({
              header: 'New version is ready to install',
              message: 'Update app to new version :)',
              rejectVisible: false,
              accept: () => location.reload()
            });
            break;
        }
      })
    ).subscribe();

    this.user$ = authService.getUser$().pipe(
      shareReplay()
    );

    this.pendingChanges$ = this.apiService.getPendingChanges$().pipe(
      map(pendingChanges => pendingChanges ? pendingChanges > 9 ? '9+' : pendingChanges.toString() : ''),
      shareReplay()
    );

    this.loadingValuePerc$ = this.loaderService.loadingStatus$.pipe(
      pairwise(),
      // Wait 500ms before showing the loader
      debounce(( [_, loadingStatus]) => {
        if (loadingStatus.total >= 1) {
          return timer(500);
        }
        return of(undefined);
      }),
      // Since I receive delayed status, maybe I receive a status of done
      // (when total === current) after another status of done
      // So I need to check that the previous status was actually a loading otherwise
      // I don't have to show the loader at all
      switchMap(([prevLoadingStatus, loadingStatus]) => {
        if (prevLoadingStatus.total !== 0 && loadingStatus.total === loadingStatus.current) {
          // Wait 250ms before removing loader
          return of('').pipe(delay(250));
        } else {
          return of(loadingStatus.total
            ? (loadingStatus.current * 100 / loadingStatus.total).toFixed(2)
            : '');
        }
      })
    );

    this.apiService.getPendingChanges$().pipe(
      debounceTime(500),
      filter(pendingChanges => pendingChanges > 0),
      tap(() => this.messageService.add({
        summary: 'Warning',
        detail: 'Some changes have not been saved remotely',
        severity: 'warn',
        life: 3000,
        closable: true
      }))
    ).subscribe();

    this.menu$ = this.user$.pipe(
      map(user => {
        if (user) {
          return [...this.menu];
        }
        return [];
      })
    );

    this.userMenu$ = combineLatest([
      this.user$,
      this.pendingChanges$
    ]).pipe(
      map(([user, pendingChanges]) => {
        if (user) {
          const userMenu: MenuItem[] = [{
            label: user.name,
            styleClass: 'font-bold md:hidden'
          },
            {
              label: pendingChanges ? `Changes to sync (${pendingChanges})` : 'No changes to sync',
              disabled: !pendingChanges,
              command: () => this.spacedRepService.syncPendingChanges().subscribe()
            },
            {separator: true}
          ];

          if (!user.token) {
            userMenu.push({
              label: "Login and sync",
              command: () => this.authService.loginAndSyncLocal()
            });
          } else {
            userMenu.push({
              label: 'Logout',
              command: () => this.logout()
            });
          }

          return userMenu;
        }
        return [];
      })
    );

    this.apiService.getOutOfSync$().pipe(
      tap(outOfSync => {
        if (outOfSync) {
          this.confirmationService.confirm({
            header: 'ATTENTION',
            message: 'You have modified stale data. You need to synchronize your data: this operation will cancel all the current changes. Are you ok with this?',
            accept: () => this.spacedRepService.sync().subscribe(),
            acceptLabel: 'Yes, let\'s sync'
          });
        }
      })
    ).subscribe();
  }

  logout(): void {
    this.confirmationService.confirm({
      header: 'Confirmation',
      message: 'Do you really want to logout?',
      accept: () => this.authService.logout(),
      dismissableMask: true
    });
  }
}
