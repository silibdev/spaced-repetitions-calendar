export interface RepetitionSchema {
  label: string;
  value: string;
}

export interface FullSettings extends Options {
  repetitionSchemaOpts: RepetitionSchema[];
}

export interface Options {
  autoSavingTimer: number;
}

export interface User {
  name: string;
  token?: string;
}
