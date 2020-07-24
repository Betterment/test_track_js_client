import qs from 'qs';
import client from './api';
import Assignment, { AssignmentData } from './assignment';
import Visitor from './visitor';

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
    return client
      .post(
        '/v1/identifier',
        qs.stringify({
          identifier_type: this.identifierType,
          value: this.value,
          visitor_id: this.visitorId
        })
      )
      .then(({ data }: IdentifierResponse) => {
        return new Visitor({
          id: data.visitor.id,
          assignments: Assignment.fromJsonArray(data.visitor.assignments)
        });
      });
  }
}

export default Identifier;
