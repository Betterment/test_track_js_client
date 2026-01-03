import Assignment from './assignment';
import Visitor from './visitor';

type Handler = () => void;

export type Variants = {
  [variant: string]: Handler;
};

export type VaryDSLOptions = {
  assignment: Assignment;
  visitor: Visitor;
  variants: Variants;
  defaultVariant: string;
};

class VaryDSL {
  private _assignment: Assignment;
  private _visitor: Visitor;
  private _variantHandlers: Variants;
  private _defaultVariant: string;

  constructor(options: VaryDSLOptions) {
    this._assignment = options.assignment;
    this._visitor = options.visitor;
    this._defaultVariant = options.defaultVariant;
    this._variantHandlers = options.variants;
  }

  run() {
    this._validate();

    let chosenHandler = this._variantHandlers[this._defaultVariant];
    const assignedVariant = this._assignment.getVariant();

    let isDefaulted = false;
    if (assignedVariant && this._variantHandlers[assignedVariant]) {
      chosenHandler = this._variantHandlers[assignedVariant];
    } else {
      isDefaulted = true;
    }

    chosenHandler();

    return { isDefaulted };
  }

  _validate() {
    const configuredVariants = Object.getOwnPropertyNames(this._variantHandlers);
    if (configuredVariants.length < 2) {
      throw new Error('must provide at least one `when`');
    }

    const split = this._visitor.config.splitRegistry.getSplit(this._assignment.getSplitName());
    if (!split) {
      return;
    }

    Object.keys(this._variantHandlers).forEach(variant => {
      if (!split.hasVariant(variant)) {
        this._visitor.logError('configures unknown variant ' + variant);
      }
    });

    const missingVariants = split.getVariants().filter(variant => !configuredVariants.includes(variant));

    if (missingVariants.length > 0) {
      const missingVariantSentence = missingVariants.join(', ').replace(/, (.+)$/, ' and $1');
      this._visitor.logError('does not configure variants ' + missingVariantSentence);
    }
  }
}

export default VaryDSL;
