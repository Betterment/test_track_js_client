export type Schema = {
  serializer_version: 1;
  identifier_types: Array<{ name: string }>;
  splits: Array<{ name: string; weights: Record<string, number> }>;
};

type Splits<S extends Schema> = {
  [I in S['splits'][number] as I['name']]: keyof I['weights'];
};

export type IdentifierType<S extends Schema> = S['identifier_types'][number]['name'];
export type SplitName<S extends Schema> = keyof Splits<S> & string;
export type VariantName<S extends Schema, N extends SplitName<S>> = Splits<S>[N] & string;
