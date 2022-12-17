import { Injectable } from '@angular/core';
import { BehaviorSubject, concat, filter, firstValueFrom, from, fromEvent, Observable, of, switchMap } from 'rxjs';
import * as netlifyIdentity from 'netlify-identity-widget';
import { User } from '../models/settings.model';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SpacedRepService } from './spaced-rep.service';
import { SwUpdate } from '@angular/service-worker';

const USER_DB_NAME = 'src-user-db';
const LOGIN_STATE_KEY = 'src-login-state';

// 'SYNC_LOCAL' means save on remote everything local
type LoginState = 'SYNC_LOCAL' | 'CLEAR_LOCAL' | 'ANONYM';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private user$ = new BehaviorSubject<User | undefined>(undefined);

  get loginState(): LoginState {
    return sessionStorage.getItem(LOGIN_STATE_KEY) as LoginState || 'ANONYM';
  }

  set loginState(state: LoginState) {
    sessionStorage.setItem(LOGIN_STATE_KEY, state);
  }

  constructor(
    private router: Router,
    private spacedRepService: SpacedRepService,
    private swUpdate: SwUpdate
  ) {
    netlifyIdentity.on('login', user => {
      netlifyIdentity.close();
      console.log('login', user);
      this.setUser({
        name: user.user_metadata?.full_name as string,
        token: user.token?.access_token
      });
    });

    netlifyIdentity.on('logout', () => {
      console.log('Logged out');
      this.resetUser();
    });

    this.user$.pipe(
      switchMap(user => {
        if (user?.token) {
          return fromEvent(window, 'visibilitychange').pipe(
            filter(() => document.visibilityState === 'visible'),
            switchMap(() => concat(
              this.spacedRepService.syncPendingChanges(),
              this.spacedRepService.sync(),
              this.swUpdate.checkForUpdate()
              )
            )
          )
        }
        return of(undefined);
      })
    ).subscribe();
  }

  private setUser(user: User): void {
    this.user$.next(user);
    const doSyncLocal = (this.loginState === 'CLEAR_LOCAL' ? this.spacedRepService.desyncLocal() : of(undefined))
      .pipe(switchMap(() => this.spacedRepService.sync()));
    firstValueFrom(
      this.loginState === 'SYNC_LOCAL' ? this.spacedRepService.syncLocal() : doSyncLocal
    ).then(() => this.router.navigate(['home']));
  }

  private resetUser(): void {
    this.user$.next(undefined);
    firstValueFrom(this.spacedRepService.desyncLocal())
      .then(() => this.router.navigate(['login']));
  }

  init = () => new Promise(resolve => {
    let resolved = false;
    netlifyIdentity.on('init', user => {
      console.log('init', user);
      // If I'm not logged, check if there is an anonymous user
      if (!user) {
        const localAnonymousUser = JSON.parse(localStorage.getItem(USER_DB_NAME) || 'null');
        if (localAnonymousUser) {
          this.setUser(localAnonymousUser);
        }
      }
      resolved = true;
      resolve(undefined);
    });
    netlifyIdentity.on('error', err => console.error('Error', err));
    // netlifyIdentity.on('open', () => console.log('Widget opened'));
    // netlifyIdentity.on('close', () => console.log('Widget closed'));
    netlifyIdentity.init();
    if (!environment.production && !resolved) {
      setTimeout(() => resolve(undefined), 2000);
    }
  });

  getUser$(): Observable<User | undefined> {
    return this.user$.asObservable();
  }

  getUser(): User | undefined {
    return this.user$.value;
  }

  logout(): void {
    if (this.getUser()?.token) {
      netlifyIdentity.logout();
    } else {
      this.resetUser();
    }
  }

  login(): void {
    this.loginState = 'CLEAR_LOCAL';
    netlifyIdentity.open();
  }

  getToken$(): Observable<string> {
    return from(netlifyIdentity.refresh());
  }

  anonymousLogin() {
    this.loginState = 'ANONYM';
    const localAnonymousUser = {
      name: 'Local Anonymous'
    };
    localStorage.setItem(USER_DB_NAME, JSON.stringify(localAnonymousUser));
    this.setUser(localAnonymousUser);
  }

  loginAndSyncLocal() {
    this.loginState = 'SYNC_LOCAL';
    netlifyIdentity.open();
  }
}
