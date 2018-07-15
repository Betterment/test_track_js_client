import $ from 'jquery';
import Assignment from './assignment';
import TestTrackConfig from './testTrackConfig';

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

Identifier.prototype.save = function(identifierType, value) {
    var deferred = $.Deferred();

    $.ajax(TestTrackConfig.getUrl() + '/api/v1/identifier', {
        method: 'POST',
        dataType: 'json',
        crossDomain: true,
        data: {
            identifier_type: this.identifierType,
            value: this.value,
            visitor_id: this.visitorId
        }
    }).then(function(identifierJson) {
        var visitor = new Visitor({
            id: identifierJson.visitor.id,
            assignments: Assignment.fromJsonArray(identifierJson.visitor.assignments)
        });
        deferred.resolve(visitor);
    });

    return deferred.promise();
};

export default Identifier;
