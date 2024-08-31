import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RepetitionSchemasComponent } from './repetition-schemas/repetition-schemas.component';
import { ManageDataComponent } from './manage-data/manage-data.component';
import { GeneralComponent } from './general/general.component';
import { ColorsComponent } from './colors/colors.component';
import { CategoriesComponent } from './categories/categories.component';

const routes: Routes = [
  {
    path: 'rep-schemas',
    component: RepetitionSchemasComponent,
  },
  {
    path: 'manage-data',
    component: ManageDataComponent,
  },
  {
    path: 'general',
    component: GeneralComponent,
  },
  {
    path: 'colors',
    component: ColorsComponent,
  },
  {
    path: 'categories',
    component: CategoriesComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
