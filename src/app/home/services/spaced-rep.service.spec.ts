import { TestBed } from '@angular/core/testing';

import { SpacedRepService } from './spaced-rep.service';

describe('SpacedRepService', () => {
  let service: SpacedRepService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpacedRepService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
