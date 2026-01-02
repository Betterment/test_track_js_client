import { request, toSearchParams, urlFor } from './api';
import Assignment, { type AssignmentData } from './assignment';
import Visitor from './visitor';
import type { Config } from './config';

type IdentifierOptions = {
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

class Identifier {
  config: Config;
  visitorId: string;
  identifierType: string;
  value: string | number;

  constructor(options: IdentifierOptions) {
    this.config = options.config;
    this.visitorId = options.visitorId;
    this.identifierType = options.identifierType;
    this.value = options.value;

    if (!this.visitorId) {
      throw new Error('must provide visitorId');
    } else if (!this.identifierType) {
      throw new Error('must provide identifierType');
    } else if (!this.value) {
      throw new Error('must provide value');
    }
  }

  save() {
    return request({
      method: 'POST',
      url: urlFor(this.config, '/api/v1/identifier'),
      body: toSearchParams({
        identifier_type: this.identifierType,
        value: this.value.toString(),
        visitor_id: this.visitorId
      })
    }).then(({ data }: IdentifierResponse) => {
      return new Visitor({
        config: this.config,
        id: data.visitor.id,
        assignments: Assignment.fromJsonArray(data.visitor.assignments)
      });
    });
  }
}

export default Identifier;
