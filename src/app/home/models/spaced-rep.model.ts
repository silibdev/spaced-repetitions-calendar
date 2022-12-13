export interface EventColor {
  primary: string;
  secondary: string;
}

export interface SpacedRepModel {
  allDay?: boolean;
  boldTitle?: boolean;
  color?: EventColor;
  description?: string;
  done?: boolean;
  highlightTitle?: boolean;
  id: string;
  linkedSpacedRepId?: string;
  repetitionNumber: number;
  shortDescription: string;
  start: Date;
  title: string;
}

export type CommonSpacedRepModel = Pick<SpacedRepModel, 'id' | 'allDay' | 'title' | 'color' | 'shortDescription' | 'boldTitle' | 'highlightTitle'>;

export type SpecificSpacedRepModel = Pick<SpacedRepModel, 'id' | 'repetitionNumber' | 'start' | 'linkedSpacedRepId' | 'done'>

export interface CreateSpacedReps {
  spacedRep: CommonSpacedRepModel & { description?: string, done?: boolean };
  startDate: Date;
  repetitionSchema: string;
}
