import Assignment from './assignment';
import Visitor from './visitor';

type Handler = () => void;

export type Variants = {
  [variant: string]: Handler;
};

type Options = {
  assignment: Assignment;
  visitor: Visitor;
  variants: Variants;
  defaultVariant: string;
};

class VaryDSL {
  private _assignment: Assignment;
  private _visitor: Visitor;
  private _variants: Variants;
  private _defaultVariant: string;

  constructor(options: Options) {
    this._assignment = options.assignment;
    this._visitor = options.visitor;
    this._defaultVariant = options.defaultVariant;
    this._variants = options.variants;
  }

  run() {
    this._validate();

    const assignedVariant = this._assignment.getVariant();

    if (assignedVariant && this._variants[assignedVariant]) {
      this._variants[assignedVariant]();
      return { isDefaulted: false };
    } else {
      this._variants[this._defaultVariant]();
      return { isDefaulted: true };
    }
  }

  _validate() {
    const configuredVariants = Object.keys(this._variants);
    if (configuredVariants.length < 2) {
      throw new Error('must provide at least two variants');
    }

    const split = this._visitor.config.splitRegistry.getSplit(this._assignment.getSplitName());
    if (!split) return;

    const splitVariants = split.getVariants();
    const unknownVariants = configuredVariants.filter(variant => !splitVariants.includes(variant));
    const missingVariants = splitVariants.filter(variant => !configuredVariants.includes(variant));

    if (unknownVariants.length > 0) {
      this._visitor.logError(`configures unknown variants: ${unknownVariants.join(', ')}`);
    }

    if (missingVariants.length > 0) {
      this._visitor.logError(`does not configure variants: ${missingVariants.join(', ')}`);
    }
  }
}

export default VaryDSL;
