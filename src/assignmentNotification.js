import $ from 'jquery';
import TestTrackConfig from './testTrackConfig';

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

    this.persistAssignment();

    this._visitor.analytics.trackAssignment(
        this._visitor.getId(),
        this._assignment,
        function(success) {
            this.persistAssignment(success ? 'success' : 'failure');
        }.bind(this));
};

AssignmentNotification.prototype.persistAssignment = function(trackResult) {
    return $.ajax(TestTrackConfig.getUrl() + '/api/v1/assignment_event', {
        method: 'POST',
        dataType: 'json',
        crossDomain: true,
        data: {
            visitor_id: this._visitor.getId(),
            split_name: this._assignment.getSplitName(),
            context: this._assignment.getContext(),
            mixpanel_result: trackResult
        }
    }).fail(function(jqXHR, textStatus, errorThrown) {
        var status = jqXHR && jqXHR.status,
            responseText = jqXHR && jqXHR.responseText;
        this._visitor.logError('test_track persistAssignment error: ' + [jqXHR, status, responseText, textStatus, errorThrown].join(', '));
    }.bind(this));
};

export default AssignmentNotification;
