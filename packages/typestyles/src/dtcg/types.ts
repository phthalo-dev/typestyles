export type DTCGToken = {
  $value: unknown;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
};

export type DTCGGroup = {
  $type?: string;
  $description?: string;
  [key: string]: DTCGGroup | DTCGToken | string | undefined | Record<string, unknown>;
};

export type DTCGErrorCode = 'alias-missing' | 'alias-cycle' | 'invalid-token' | 'type-mismatch';

export type DTCGError = { code: DTCGErrorCode; path: string; message: string };

export type DTCGResult<T> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; errors: DTCGError[] };

export type FromDTCGOptions = {
  /** Resolve an alias target that is not present in the tree. */
  resolveExternal?: (path: string) => string | undefined;
};
