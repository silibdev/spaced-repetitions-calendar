import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { debounceTime, Observable, Subject, switchMap } from 'rxjs';
import { SpacedRepModel } from '../models/spaced-rep.model';
import { SREventRepository } from '../s-r-viewer/state/s-r-event.repository';

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

  constructor(private srEventRepository: SREventRepository) {
    this.results$ = this.searchQuery$.pipe(
      debounceTime(100),
      switchMap((query) => this.srEventRepository.getAllFiltered(query)),
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
