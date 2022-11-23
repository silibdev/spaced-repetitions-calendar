import { Component } from '@angular/core';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { AuthService } from './home/services/auth.service';
import { combineLatest, map, Observable, shareReplay, tap } from 'rxjs';
import { User } from './home/models/settings.model';
import { ApiService } from './home/services/api.service';
import { SpacedRepService } from './home/services/spaced-rep.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [ConfirmationService]
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

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private spacedRepService: SpacedRepService,
    private confirmationService: ConfirmationService,
  ) {
    this.user$ = authService.getUser$().pipe(
      shareReplay()
    );

    this.pendingChanges$ = this.apiService.getPendingChanges$().pipe(
      map(pendingChanges => pendingChanges ? pendingChanges > 9 ? '9+' : pendingChanges.toString() : ''),
      shareReplay()
    );

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
              command: () => this.apiService.syncPendingChanges().subscribe()
            },
            { separator: true}
          ];

          if (!user.token) {
            userMenu.push({
              label: "Login and sync"
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
      tap( outOfSync => {
        if(outOfSync) {
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
