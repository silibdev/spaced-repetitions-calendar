import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SettingsRoutingModule } from './settings-routing.module';
import { RepetitionSchemasComponent } from './repetition-schemas/repetition-schemas.component';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ManageDataComponent } from './manage-data/manage-data.component';
import { FileUploadModule } from 'primeng/fileupload';
import { HttpClientModule } from '@angular/common/http';
import { MessageModule } from 'primeng/message';
import { GeneralComponent } from './general/general.component';
import { InputNumberModule } from 'primeng/inputnumber';
import { FieldsetModule } from 'primeng/fieldset';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ColorsComponent } from './colors/colors.component';
import { ColorPickerModule } from 'primeng/colorpicker';
import { CategoriesComponent } from './categories/categories.component';

@NgModule({
  declarations: [
    RepetitionSchemasComponent,
    ManageDataComponent,
    GeneralComponent,
    ColorsComponent,
    CategoriesComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SettingsRoutingModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    ConfirmPopupModule,
    FileUploadModule,
    HttpClientModule,
    MessageModule,
    InputNumberModule,
    FieldsetModule,
    ConfirmDialogModule,
    ColorPickerModule,
  ],
})
export class SettingsModule {}
