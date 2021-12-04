import { Component, OnInit } from '@angular/core';
import packageJson from '../../../package.json';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {
  version = packageJson.version;

  constructor() { }

  ngOnInit(): void {
  }

}
