class Assignment {
  static fromJsonArray(assignmentsJson) {
    return assignmentsJson.map(
      ({ split_name, variant, context, unsynced }) =>
        new Assignment({
          context,
          variant,
          splitName: split_name,
          isUnsynced: unsynced
        })
    );
  }

  constructor(options) {
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
  }

  getSplitName() {
    return this._splitName;
  }

  getVariant() {
    return this._variant;
  }

  setVariant(variant) {
    this._variant = variant;
  }

  getContext() {
    return this._context;
  }

  setContext(context) {
    this._context = context;
  }

  isUnsynced() {
    return this._isUnsynced;
  }

  setUnsynced(unsynced) {
    this._isUnsynced = unsynced;
  }
}

export default Assignment;
