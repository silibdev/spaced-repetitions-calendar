import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
// TODO remove unused code
//import { HomeComponent } from './home/home.component';
import { SRViewerComponent } from './s-r-viewer/s-r-viewer/s-r-viewer.component';

const routes: Routes = [
  {
    path: '',
    component: SRViewerComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeRoutingModule {}
