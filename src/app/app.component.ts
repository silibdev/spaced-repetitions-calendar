import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { AuthService } from './home/services/auth.service';
import { map, Observable, shareReplay } from 'rxjs';
import { User } from './home/models/settings.model';
import { logout } from 'netlify-identity-widget';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
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

  constructor(
    private authService: AuthService
  ) {
    this.user$ = authService.getUser$().pipe(
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

    this.userMenu$ = this.user$.pipe(
      map(user => {
        if (user) {
          const userMenu: MenuItem[] = [{
            label: user.name,
            styleClass: 'font-bold md:hidden'
          }];

          if (!user.token) {
            userMenu.push({
              label: "Login and sync"
            });
          } else {
            userMenu.push({
              label: 'Logout',
              command: () => logout()
            });
          }

          return userMenu;
        }
        return [];
      })
    );
  }

  logout(): void {
    this.authService.logout();
  }
}
