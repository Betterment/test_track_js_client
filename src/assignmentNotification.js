import client from './api';

var AssignmentNotification = function(options) {
  options = options || {};
  this._visitor = options.visitor;
  this._assignment = options.assignment;

  if (!this._visitor) {
    throw new Error('must provide visitor');
  } else if (!this._assignment) {
    throw new Error('must provide assignment');
  }
};

AssignmentNotification.prototype.send = function() {
  // FIXME: The current implementation of this requires 2 HTTP requests
  // to guarantee that the server is notified of the assignment. By decoupling
  // the assignment notification from the analytics write success we can
  // bring this down to 1 HTTP request

  const firstPersist = this._persistAssignment();

  const secondPersist = this._visitor.analytics
    .trackAssignment(this._visitor.getId(), this._assignment)
    .then(success => this._persistAssignment(success ? 'success' : 'failure'));

  return Promise.all([firstPersist, secondPersist]);
};

AssignmentNotification.prototype._persistAssignment = function(trackResult) {
  return client
    .post('/v1/assignment_event', {
      visitor_id: this._visitor.getId(),
      split_name: this._assignment.getSplitName(),
      context: this._assignment.getContext(),
      mixpanel_result: trackResult
    })
    .catch(({ response }) => {
      this._visitor.logError(
        `test_track persistAssignment error: ${response.status}, ${response.statusText}, ${response.data}`
      );
    });
};

export default AssignmentNotification;
