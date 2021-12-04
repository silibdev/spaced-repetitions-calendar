import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RepetitionSchemasComponent } from './repetition-schemas/repetition-schemas.component';

const routes: Routes = [
  {
    path: 'rep-schemas', component: RepetitionSchemasComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingsRoutingModule { }
