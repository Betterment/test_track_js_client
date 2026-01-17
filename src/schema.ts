export type Schema = {
  serializer_version: 1;
  identifier_types: Array<{ name: string }>;
};

export type IdentifierType<S extends Schema> = S['identifier_types'][number]['name'];
