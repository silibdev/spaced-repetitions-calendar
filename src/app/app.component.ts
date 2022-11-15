import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import * as netlifyIdentity from 'netlify-identity-widget';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  menu: MenuItem[] = [
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

  user: any;

  constructor() {
    netlifyIdentity.init();
    netlifyIdentity.on('init', user => {
      this.user = user;
      console.log('init', user)
    });
    netlifyIdentity.on('login', user => {
      this.user = user;
      console.log('login', user);
    });
    netlifyIdentity.on('logout', () => {
      this.user = undefined;
      console.log('Logged out');
    });
    netlifyIdentity.on('error', err => console.error('Error', err));
    netlifyIdentity.on('open', () => console.log('Widget opened'));
    netlifyIdentity.on('close', () => console.log('Widget closed'));
  }

  login(): void {
    netlifyIdentity.open();
  }

  logout(): void {
    netlifyIdentity.logout();
  }
}
