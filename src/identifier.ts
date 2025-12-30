import { request, toSearchParams } from './api';
import Assignment, { type AssignmentData } from './assignment';
import Visitor from './visitor';
import TestTrackConfig from './testTrackConfig';

type IdentifierOptions = {
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
  visitorId: string;
  identifierType: string;
  value: string | number;

  constructor(options: IdentifierOptions) {
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
      url: TestTrackConfig.urlFor('/api/v1/identifier'),
      body: toSearchParams({
        identifier_type: this.identifierType,
        value: this.value.toString(),
        visitor_id: this.visitorId
      })
    }).then(({ data }: IdentifierResponse) => {
      return new Visitor({
        id: data.visitor.id,
        assignments: Assignment.fromJsonArray(data.visitor.assignments)
      });
    });
  }
}

export default Identifier;
