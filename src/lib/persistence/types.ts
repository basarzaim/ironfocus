export interface PersistenceAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export type PersistenceManifest = {
  version: 2;
  migratedAt: string;
  source: "localStorage" | "fresh" | "store";
};

export type PersistenceLoadIssue = {
  key: string;
  message: string;
};
