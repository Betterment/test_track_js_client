import { request, toSearchParams } from './api';
import Visitor from './visitor';
import Assignment from './assignment';

export type AssignmentNotificationOptions = {
  visitor: Visitor;
  assignment: Assignment;
};

class AssignmentNotification {
  private _visitor: Visitor;
  private _assignment: Assignment;

  constructor({ visitor, assignment }: AssignmentNotificationOptions) {
    this._visitor = visitor;
    this._assignment = assignment;

    if (!this._visitor) {
      throw new Error('must provide visitor');
    } else if (!this._assignment) {
      throw new Error('must provide assignment');
    }
  }

  send() {
    // FIXME: The current implementation of this requires 2 HTTP requests
    // to guarantee that the server is notified of the assignment. By decoupling
    // the assignment notification from the analytics write success we can
    // bring this down to 1 HTTP request

    const firstPersist = this._persistAssignment();

    const secondPersist = new Promise(resolve => {
      this._visitor.analytics.trackAssignment(this._visitor.getId(), this._assignment, (success: boolean) =>
        this._persistAssignment(success ? 'success' : 'failure').then(resolve)
      );
    });

    return Promise.all([firstPersist, secondPersist]);
  }

  _persistAssignment(trackResult?: 'success' | 'failure') {
    return request({
      method: 'POST',
      url: this._visitor.config.urlFor('/api/v1/assignment_event'),
      body: toSearchParams({
        visitor_id: this._visitor.getId(),
        split_name: this._assignment.getSplitName(),
        context: this._assignment.getContext(),
        mixpanel_result: trackResult
      })
    }).catch(error => {
      this._visitor.logError(`test_track persistAssignment error: ${error}`);
    });
  }
}

export default AssignmentNotification;
