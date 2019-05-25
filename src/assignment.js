var Assignment = function(options) {
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

Assignment.fromJsonArray = function(assignmentsJson) {
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

Assignment.prototype.getSplitName = function() {
    return this._splitName;
};

Assignment.prototype.getVariant = function() {
    return this._variant;
};

Assignment.prototype.setVariant = function(variant) {
    this._variant = variant;
};

Assignment.prototype.getContext = function() {
    return this._context;
};

Assignment.prototype.setContext = function(context) {
    this._context = context;
};

Assignment.prototype.isUnsynced = function() {
    return this._isUnsynced;
};

Assignment.prototype.setUnsynced = function(unsynced) {
    this._isUnsynced = unsynced;
};

export default Assignment;
