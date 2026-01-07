import type { V1Assignment } from './client';

export type AssignmentOptions = {
  splitName: string;
  variant: string | null;
  context?: string;
  isUnsynced: boolean;
};

export default class Assignment {
  static fromV1Assignment(data: V1Assignment) {
    return new Assignment({
      context: data.context,
      variant: data.variant,
      splitName: data.split_name,
      isUnsynced: data.unsynced
    });
  }

  private _splitName: string;
  private _variant: string | null;
  private _context?: string;
  private _isUnsynced: boolean;

  constructor(options: AssignmentOptions) {
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
