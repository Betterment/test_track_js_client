import { request, toSearchParams, urlFor } from './api';
import Assignment, { type AssignmentData } from './assignment';
import Visitor from './visitor';
import type { Config } from './config';

type Options = {
  config: Config;
  visitorId: string;
  identifierType: string;
  value: string | number;
};

type IdentifierResponse = {
  data: {
    visitor: {
      id: string;
      assignments: AssignmentData[];
    };
  };
};

export async function saveIdentifier({ config, visitorId, identifierType, value }: Options) {
  const { data }: IdentifierResponse = await request({
    method: 'POST',
    url: urlFor(config, '/api/v1/identifier'),
    body: toSearchParams({
      identifier_type: identifierType,
      value: value.toString(),
      visitor_id: visitorId
    })
  });

  return new Visitor({
    config,
    id: data.visitor.id,
    assignments: Assignment.fromJsonArray(data.visitor.assignments)
  });
}
