import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SpacedRepService } from '../services/spaced-rep.service';
import { debounceTime, Observable, Subject, switchMap } from 'rxjs';
import { SpacedRepModel } from '../models/spaced-rep.model';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent implements OnInit {
  searchQuery?: string;
  searchQuery$ = new Subject<string>();
  results$: Observable<SpacedRepModel[]>;

  @Output()
  eventClicked = new EventEmitter<SpacedRepModel>();

  constructor(private srService: SpacedRepService) {
    this.results$ = this.searchQuery$.pipe(
      debounceTime(100),
      switchMap((query) => this.srService.search(query)),
    );
  }

  ngOnInit(): void {}

  search(query: string): void {
    this.searchQuery$.next(query);
  }

  selectResult(sr: SpacedRepModel): void {
    this.eventClicked.emit(sr);
    setTimeout(() => (this.searchQuery = ''));
  }
}
