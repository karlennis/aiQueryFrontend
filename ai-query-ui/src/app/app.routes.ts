import { Routes } from '@angular/router';
import { QueryComponent } from './components/query/query.component';
import { HistoryComponent } from './components/history/history.component';

export const routes: Routes = [
  { path: '', component: QueryComponent },
  { path: 'history', component: HistoryComponent }
];
