import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MenubarModule } from 'primeng/menubar';
import { SharedModule } from 'primeng/api';
import { ReactiveFormsModule } from '@angular/forms';
import { AboutComponent } from './about/about.component';
import { ButtonModule } from 'primeng/button';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { HttpClientModule } from '@angular/common/http';
import { AUTH_INTERCEPTOR_PROVIDER } from './home/services/auth.interceptor';
import { AuthService } from './home/services/auth.service';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { BULK_INTERCEPTOR_PROVIDER } from './home/services/bulk.interceptor';
import { ProgressBarModule } from 'primeng/progressbar';
import { LOADER_INTERCEPTOR_PROVIDER } from './home/services/loader.interceptor';
import { OUT_OF_SYNC_INTERCEPTOR_PROVIDER } from './home/services/out-of-sync.interceptor';

@NgModule({
  declarations: [AppComponent, AboutComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MenubarModule,
    SharedModule,
    ButtonModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
    MenuModule,
    BadgeModule,
    ConfirmDialogModule,
    ToastModule,
    ProgressBarModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (authService: AuthService) => authService.init,
      deps: [AuthService],
      multi: true,
    },
    LOADER_INTERCEPTOR_PROVIDER,
    OUT_OF_SYNC_INTERCEPTOR_PROVIDER,
    BULK_INTERCEPTOR_PROVIDER,
    AUTH_INTERCEPTOR_PROVIDER,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
