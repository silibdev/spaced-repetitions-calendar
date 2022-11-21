import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    if (this.authService.getUser()) {
      this.router.navigate(['home']);
    }
  }

  ngOnInit(): void {
  }

  login(): void {
    this.authService.login();
  }

  anonymousLogin(): void {
    this.authService.anonymousLogin();
  }
}
