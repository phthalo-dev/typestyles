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
  /**
   * Resolve an alias target that is not present in the tree. Return a string value, or
   * `undefined` to leave it unresolved (`alias-missing`). Any non-string result counts as
   * missing; the returned string is checked like any other value.
   */
  resolveExternal?: (path: string) => string | undefined;
  /** Deepest allowed nesting of group and token names (a top-level token is depth 1). Default 32. */
  maxDepth?: number;
  /** Longest allowed name (one path segment), in UTF-16 code units. Default 128. */
  maxNameLength?: number;
  /** Most tokens the tree may contain. Default 50,000. */
  maxTokens?: number;
};
