var Assignment = (function() { // jshint ignore:line
    var _Assignment = function(options) {
        if (!options.splitName) {
            throw new Error('must provide splitName');
        } else if (!options.hasOwnProperty('variant')) {
            throw new Error('must provide variant');
        } else if (!options.hasOwnProperty('isUnsynced')) {
            throw new Error('must provide isUnsynced');
        }

        this._splitName = options.splitName;
        this._variant = options.variant;
        this._context = options.context;
        this._isUnsynced = options.isUnsynced;
    };

    _Assignment.fromJsonArray = function(assignmentsJson) {
        var assignments = [];
        for (var i = 0; i < assignmentsJson.length; i++) {
            assignments.push(new Assignment({
                splitName: assignmentsJson[i].split_name,
                variant: assignmentsJson[i].variant,
                context: assignmentsJson[i].context,
                isUnsynced: assignmentsJson[i].unsynced
            }));
        }

        return assignments;
    };

    _Assignment.prototype.getSplitName = function() {
        return this._splitName;
    };

    _Assignment.prototype.getVariant = function() {
        return this._variant;
    };

    _Assignment.prototype.setVariant = function(variant) {
        this._variant = variant;
    };

    _Assignment.prototype.getContext = function() {
        return this._context;
    };

    _Assignment.prototype.setContext = function(context) {
        this._context = context;
    };

    _Assignment.prototype.isUnsynced = function() {
        return this._isUnsynced;
    };

    _Assignment.prototype.setUnsynced = function(unsynced) {
        this._isUnsynced = unsynced;
    };

    return _Assignment;
})();
