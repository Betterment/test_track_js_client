export type AssignmentData = {
  split_name: string;
  variant: string;
  context?: string;
  unsynced: boolean;
};

export type AssignmentOptions = {
  splitName: string;
  variant: string | null;
  context?: string;
  isUnsynced: boolean;
};

class Assignment {
  static fromJsonArray(assignmentsJson: AssignmentData[]) {
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

  private _splitName: string;
  private _variant: string | null;
  private _context?: string;
  private _isUnsynced: boolean;

  constructor(options: AssignmentOptions) {
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

  setVariant(variant: string) {
    this._variant = variant;
  }

  getContext() {
    return this._context;
  }

  setContext(context: string) {
    this._context = context;
  }

  isUnsynced() {
    return this._isUnsynced;
  }

  setUnsynced(unsynced: boolean) {
    this._isUnsynced = unsynced;
  }
}

export default Assignment;
