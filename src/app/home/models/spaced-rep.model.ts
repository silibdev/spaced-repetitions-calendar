import { CalendarEvent } from 'angular-calendar';

export interface SpacedRepModel extends CalendarEvent {
  linkedSpacedRepId?: string | number;
  description: string;
  done: boolean;
  shortDescription: string;
}

export interface CreateSpacedReps {
  spacedRep: Pick<SpacedRepModel, 'title' | 'description' | 'color' | 'shortDescription'>;
  startDate: Date;
  repetitionSchema: string;
}
