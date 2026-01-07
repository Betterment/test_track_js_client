export type V1Assignment = {
  split_name: string;
  variant: string;
  context: string;
  unsynced: boolean;
};

export type V1Visitor = {
  id: string;
  assignments: V1Assignment[];
};

export type V1Identifier = {
  visitor: V1Visitor;
};

export type V1IdentifierParams = {
  visitor_id: string;
  identifier_type: string;
  value: string;
};

export type V1AssignmentOverrideParams = {
  visitor_id: string;
  split_name: string;
  variant: string;
  context: string | null | undefined;
  mixpanel_result: string | null | undefined;
  auth: { username: string; password: string };
};

export type V1AssignmentEventParams = {
  visitor_id: string;
  split_name: string;
  context: string | null | undefined;
  mixpanel_result: string | null | undefined;
};
