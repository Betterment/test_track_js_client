import Assignment from './assignment';
import Visitor from './visitor';

export type VaryDSLOptions = {
  assignment: Assignment;
  visitor: Visitor;
};

type Handler = () => void;

class VaryDSL {
  private _assignment: Assignment;
  private _visitor: Visitor;
  private _variantHandlers: {
    [variant: string]: () => void;
  };
  private _defaultVariant?: string;
  private _defaulted?: boolean;

  constructor(options: VaryDSLOptions) {
    this._assignment = options.assignment;
    this._visitor = options.visitor;

    this._variantHandlers = {};
  }

  when(variant: string, handler: Handler) {
    this._assignHandlerToVariant(variant, handler);
  }

  default(variant: string, handler: Handler) {
    if (this._defaultVariant) {
      throw new Error('must provide exactly one `default`');
    }

    this._defaultVariant = this._assignHandlerToVariant(variant, handler);
  }

  run() {
    this._validate();

    const defaultVariant = this.getDefaultVariant();

    if (typeof defaultVariant === 'undefined') {
      throw new Error('must provide exactly one `default`');
    }

    let chosenHandler = this._variantHandlers[defaultVariant];
    const assignedVariant = this._assignment.getVariant();

    if (assignedVariant && this._variantHandlers[assignedVariant]) {
      chosenHandler = this._variantHandlers[assignedVariant];
    } else {
      this._defaulted = true;
    }

    chosenHandler();
  }

  isDefaulted() {
    return this._defaulted || false;
  }

  getDefaultVariant() {
    return this._defaultVariant;
  }

  _assignHandlerToVariant(variant: string, handler: Handler) {
    const split = this._getSplit();
    if (split && !split.hasVariant(variant)) {
      this._visitor.logError('configures unknown variant ' + variant);
    }

    this._variantHandlers[variant] = handler;

    return variant;
  }

  _validate() {
    if (!this.getDefaultVariant()) {
      throw new Error('must provide exactly one `default`');
    } else if (this._getVariants().length < 2) {
      throw new Error('must provide at least one `when`');
    } else if (!this._getSplit()) {
      return;
    }

    const missingVariants = this._getMissingVariants();

    if (missingVariants.length > 0) {
      const missingVariantSentence = missingVariants.join(', ').replace(/, (.+)$/, ' and $1');
      this._visitor.logError('does not configure variants ' + missingVariantSentence);
    }
  }

  _getSplit() {
    return this._visitor.config.splitRegistry.getSplit(this._assignment.getSplitName());
  }

  _getVariants() {
    return Object.getOwnPropertyNames(this._variantHandlers);
  }

  _getMissingVariants() {
    const variants = this._getVariants();
    const split = this._getSplit();
    const splitVariants = split!.getVariants();
    return splitVariants.filter(variant => !variants.includes(variant));
  }
}

export default VaryDSL;
