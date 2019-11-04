import client from './api';
import Assignment from './assignment';
import TestTrackConfig from './testTrackConfig';
import Visitor from './visitor';

var Identifier = function(options) {
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
};

Identifier.prototype.save = function() {
  return client
    .post(
      '/identifier',
      {
        identifier_type: this.identifierType,
        value: this.value,
        visitor_id: this.visitorId
      },
      { crossDomain: true }
    )
    .then(identifierJson => {
      return new Visitor({
        id: identifierJson.visitor.id,
        assignments: Assignment.fromJsonArray(identifierJson.visitor.assignments)
      });
    });
};

export default Identifier;
