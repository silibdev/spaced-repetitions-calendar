import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';

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
          label: 'Repetition schemas',
          routerLink: 'settings/rep-schemas'
        }
      ]
    },
    {
      label: 'About',
      routerLink: 'about'
    }
  ]
}
