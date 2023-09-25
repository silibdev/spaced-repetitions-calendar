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
import { DialogMaximizedDirective } from './dialog-maximized.directive';
import { CheckboxModule } from 'primeng/checkbox';
import { EditorModule } from 'primeng/editor';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SearchComponent } from './search/search.component';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ListViewComponent } from './list-view/list-view.component';
import { TableModule } from 'primeng/table';
import { LoginComponent } from './login/login.component';
import { PanelModule } from 'primeng/panel';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { ImageModule } from 'primeng/image';
import { TabViewModule } from 'primeng/tabview';
import { AvatarModule } from 'primeng/avatar';
import { DayEventsViewComponent } from './home/day-events-view/day-events-view.component';
import { MultiSegmentBarComponent } from './multi-segment-bar/multi-segment-bar.component';
import { QNAComponent } from './event-view/q-n-a/q-n-a.component';
import { AccordionModule } from 'primeng/accordion';


@NgModule({
  declarations: [
    HomeComponent,
    CalendarHeaderComponent,
    EventViewComponent,
    DialogMaximizedDirective,
    SearchComponent,
    ListViewComponent,
    LoginComponent,
    DayEventsViewComponent,
    MultiSegmentBarComponent,
    QNAComponent
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
    SelectButtonModule,
    CheckboxModule,
    EditorModule,
    ToggleButtonModule,
    ConfirmDialogModule,
    AutoCompleteModule,
    TableModule,
    PanelModule,
    FileUploadModule,
    TooltipModule,
    ImageModule,
    TabViewModule,
    AvatarModule,
    AccordionModule
  ],
  providers: [
    TitleFormatterProvider
  ]
})
export class HomeModule { }
