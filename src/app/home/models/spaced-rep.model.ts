import { CalendarEvent } from 'angular-calendar';

export interface SpacedRepModel extends CalendarEvent{
  linkedSpacedRepId?: string | number;
  description: string;
}

export interface CreateSpacedReps {
  spacedRep: Pick<SpacedRepModel, 'title' | 'description' | 'color'>;
  startDate: Date;
  repetitionSchema: string;
}
