export interface EventColor {
  primary: string;
  secondary: string;
}

export interface Photo {
  name: string;
  id: string;
  // Per le nuove immagini è l'url del blob, per quelle salvate la stringa base64
  // brutto brutto ma per ora è cosi' stacce
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

export function extractCommonModel(sr: CommonSpacedRepModel | SpacedRepModel): {
  masterId: string,
    common: CommonSpacedRepModel
} {
  const masterId = 'linkedSpacedRepId' in sr ? sr.linkedSpacedRepId || sr.id : sr.id;
  const common: CommonSpacedRepModel = {
    id: masterId,
    allDay: sr.allDay,
    shortDescription: sr.shortDescription,
    boldTitle: sr.boldTitle,
    highlightTitle: sr.highlightTitle,
    color: sr.color,
    title: sr.title,
    category: sr.category
  };
  return {masterId, common};
}

export interface CreateSpacedReps {
  spacedRep: CommonSpacedRepModel & { description?: string, done?: boolean };
  startDate: Date;
  repetitionSchema: string;
}

export type QNAStatus = 'correct' | 'wrong' | undefined // undefined = not answered

export interface QNA {
  question: string;
  answer: string;
  status: QNAStatus;
  id?: string;
}
