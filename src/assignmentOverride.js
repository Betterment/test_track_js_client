import client from './api';
import TestTrackConfig from './testTrackConfig';

var AssignmentOverride = function(options) {
  options = options || {};
  this._visitor = options.visitor;
  this._assignment = options.assignment;
  this._username = options.username;
  this._password = options.password;

  if (!this._visitor) {
    throw new Error('must provide visitor');
  } else if (!this._assignment) {
    throw new Error('must provide assignment');
  } else if (!this._username) {
    throw new Error('must provide username');
  } else if (!this._password) {
    throw new Error('must provide password');
  }
};

AssignmentOverride.prototype.persistAssignment = function() {
  return client
    .post(
      TestTrackConfig.getUrl() + '/api/v1/assignment_override',
      {
        visitor_id: this._visitor.getId(),
        split_name: this._assignment.getSplitName(),
        variant: this._assignment.getVariant(),
        context: this._assignment.getContext(),
        mixpanel_result: 'success' // we don't want to track overrides
      },
      {
        crossDomain: true,
        headers: {
          Authorization: 'Basic ' + btoa(this._username + ':' + this._password)
        }
      }
    )
    .catch(failure => {
      this._visitor.logError(
        `test_track persistAssignment error:
          ${failure.response.status},
          ${failure.response.statusText},
          ${failure.response.data}`
      );
    });
};

export default AssignmentOverride;
