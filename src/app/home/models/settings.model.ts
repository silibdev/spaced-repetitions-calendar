export interface RepetitionSchema {
  label: string;
  value: string;
}

export interface FullSettings extends Options {
  repetitionSchemaOpts: RepetitionSchema[];
  currentVersion: number | undefined;
  colors: Color[];
  category: {
    opts: Category[];
    current: string;
  };
}

export interface Color {
  label: string;
  value: string;
}

export interface Category {
  label: string;
  value: string;
}

export const DEFAULT_CATEGORY = 'default';

export interface Options {
  autoSavingTimer: number;
}

export interface User {
  name: string;
  token?: string;
}

export enum RepetitionTypeEnum {
  ONCE_A_WEEK = 'ONCE_A_WEEK',
  EVERY_DAY = 'EVERY_DAY',
  CUSTOM = 'CUSTOM',
  SINGLE = 'SINGLE',
}

export interface RepetitionType {
  label: string;
  value: RepetitionTypeEnum;
}
