import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home/home.component';
import { CalendarModule as FullCalendar, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { CalendarHeaderComponent } from './calendar-header/calendar-header.component';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EventViewComponent } from './event-view/event-view.component';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BlockUIModule } from 'primeng/blockui';
import { CalendarModule } from 'primeng/calendar';
import { MessageModule } from 'primeng/message';
import { ColorPickerModule } from 'primeng/colorpicker';
import { TitleFormatterProvider } from './services/title-formatter.provider';
import { SelectButtonModule } from 'primeng/selectbutton';


@NgModule({
  declarations: [
    HomeComponent,
    CalendarHeaderComponent,
    EventViewComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HomeRoutingModule,
    FullCalendar.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory
    }),
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    ProgressSpinnerModule,
    BlockUIModule,
    CalendarModule,
    MessageModule,
    ColorPickerModule,
    SelectButtonModule
  ],
  providers: [
    TitleFormatterProvider
  ]
})
export class HomeModule { }
