export interface RepetitionSchema {
  label: string;
  value: string;
}

export interface FullSettings extends Options {
  repetitionSchemaOpts: RepetitionSchema[];
  currentVersion: number | undefined;
  colors: Color[];
}

export interface Color {
  label: string;
  value: string;
}

export interface Options {
  autoSavingTimer: number;
}

export interface User {
  name: string;
  token?: string;
}
