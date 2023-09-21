export type IndexMap<K extends string, V> = {
  [key in K]: V;
};

export type RowFieldValue = number | string | boolean | undefined | null | number[] | string[] | boolean[];

export interface RowSet {
  aggregates?: IndexMap<string, JsonValue> | null;
  rows?: Row[] | null;
}

export type QueryResponse = RowSet[];

export interface Row {
  id?: string | number;
  vector?: number[];
  score?: number;
  version?: number;
  [key: string]: RowFieldValue;
}

type JsonValue = boolean | number | string | null | JsonValue[] | { [key: string]: JsonValue };
