export type Schema = {
  serializer_version: 1;
  identifier_types: Array<{ name: string }>;
  splits: Array<{ name: string; weights: Record<string, number> }>;
};

export type IdentifierType<S extends Schema> = S['identifier_types'][number]['name'];
export type SplitName<S extends Schema> = S['splits'][number]['name'];
