import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RepetitionSchemasComponent } from './repetition-schemas/repetition-schemas.component';
import { ImportExportComponent } from './import-export/import-export.component';
import { GeneralComponent } from './general/general.component';
import { ColorsComponent } from './colors/colors.component';

const routes: Routes = [
  {
    path: 'rep-schemas', component: RepetitionSchemasComponent
  },
  {
    path: 'import-export', component: ImportExportComponent,
  },
  {
    path: 'general', component: GeneralComponent,
  },
  {
    path: 'colors', component: ColorsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingsRoutingModule { }
