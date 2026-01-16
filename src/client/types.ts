export type V2AssignmentOverrideParams = {
  visitor_id: string;
  assignments: Array<{ split_name: string; variant: string; context: string | null | undefined }>;
  auth: { username: string; password: string };
};

export type V1AssignmentEventParams = {
  visitor_id: string;
  split_name: string;
  context: string | null | undefined;
};

export type V4Variant = Readonly<{
  name: string;
  weight: number;
}>;

export type V4Split = Readonly<{
  name: string;
  variants: ReadonlyArray<V4Variant>;
  feature_gate: boolean;
}>;

export type V4Assignment = Readonly<{
  split_name: string;
  variant: string;
}>;

export type V4Visitor = Readonly<{
  id: string;
  assignments: ReadonlyArray<V4Assignment>;
}>;

export type V4VisitorConfig = Readonly<{
  splits: ReadonlyArray<V4Split>;
  visitor: V4Visitor;
  experience_sampling_weight: number;
}>;

export type V4IdentifierParams = {
  visitor_id: string;
  identifier_type: string;
  value: string;
};
