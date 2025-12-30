import { request, toSearchParams } from './api';
import Assignment from './assignment';
import Visitor from './visitor';

export type AssignmentOverrideOptions = {
  visitor: Visitor;
  assignment: Assignment;
  username: string;
  password: string;
};

class AssignmentOverride {
  private _visitor: Visitor;
  private _assignment: Assignment;
  private _username: string;
  private _password: string;

  constructor(options: AssignmentOverrideOptions) {
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
  }

  persistAssignment() {
    return request({
      method: 'POST',
      url: '/api/v1/assignment_override',
      body: toSearchParams({
        visitor_id: this._visitor.getId(),
        split_name: this._assignment.getSplitName(),
        variant: this._assignment.getVariant(),
        context: this._assignment.getContext(),
        mixpanel_result: 'success' // we don't want to track overrides
      }),
      auth: {
        username: this._username,
        password: this._password
      }
    }).catch(error => {
      this._visitor.logError(`test_track persistAssignment error: ${error}`);
    });
  }
}

export default AssignmentOverride;
