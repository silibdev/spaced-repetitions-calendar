import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { SpacedRepService } from '../services/spaced-rep.service';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  somethingIsPresentLocally$: Observable<boolean> = of(false);

  constructor(
    private authService: AuthService,
    private router: Router,
    private spacedRepService: SpacedRepService,
  ) {
    if (this.authService.getUser()) {
      this.router.navigate(['home']);
    }
  }

  ngOnInit(): void {
    this.somethingIsPresentLocally$ =
      this.spacedRepService.isSomethingPresent();
  }

  login(): void {
    this.authService.login();
  }

  loginAndSyncLocal() {
    this.authService.loginAndSyncLocal();
  }

  anonymousLogin(): void {
    this.authService.anonymousLogin();
  }
}
