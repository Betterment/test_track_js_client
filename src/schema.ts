export type AnySchema = {
  serializer_version: 1;
  identifier_types: Array<{ name: string }>;
  splits: Array<{ name: string; weights: Record<string, number> }>;
};

export type Splits<S extends AnySchema> = {
  [I in S['splits'][number] as I['name']]: keyof I['weights'];
};

export type IdentifierType<S extends AnySchema> = S['identifier_types'][number]['name'];
export type SplitName<S extends AnySchema> = keyof Splits<S> & string;
export type VariantName<S extends AnySchema, N extends SplitName<S>> = Splits<S>[N] & string;
