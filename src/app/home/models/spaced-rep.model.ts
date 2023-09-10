export interface EventColor {
  primary: string;
  secondary: string;
}

export interface Photo {
  name: string;
  id: string;
  thumbnail: string;
  toDelete?: boolean;
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
  category: string;
  photos?: Photo[];
}

export type CommonSpacedRepModel = Pick<SpacedRepModel, 'id' | 'allDay' | 'title' | 'color' | 'shortDescription' | 'boldTitle' | 'highlightTitle' | 'category' | 'photos'>;

export type SpecificSpacedRepModel = Pick<SpacedRepModel, 'id' | 'repetitionNumber' | 'start' | 'linkedSpacedRepId' | 'done'>

export interface CreateSpacedReps {
  spacedRep: CommonSpacedRepModel & { description?: string, done?: boolean };
  startDate: Date;
  repetitionSchema: string;
}
