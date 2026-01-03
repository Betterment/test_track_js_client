import Assignment from './assignment';
import Visitor from './visitor';

export type VaryDSLOptions = {
  assignment: Assignment;
  visitor: Visitor;
  defaultVariant: string;
};

type Handler = () => void;

class VaryDSL {
  private _assignment: Assignment;
  private _visitor: Visitor;
  private _variantHandlers: {
    [variant: string]: () => void;
  };
  private _defaultVariant: string;

  constructor(options: VaryDSLOptions) {
    this._assignment = options.assignment;
    this._visitor = options.visitor;
    this._defaultVariant = options.defaultVariant;

    this._variantHandlers = {};
  }

  when(variant: string, handler: Handler) {
    const split = this._visitor.config.splitRegistry.getSplit(this._assignment.getSplitName());
    if (split && !split.hasVariant(variant)) {
      this._visitor.logError('configures unknown variant ' + variant);
    }

    this._variantHandlers[variant] = handler;
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

    const missingVariants = split.getVariants().filter(variant => !configuredVariants.includes(variant));

    if (missingVariants.length > 0) {
      const missingVariantSentence = missingVariants.join(', ').replace(/, (.+)$/, ' and $1');
      this._visitor.logError('does not configure variants ' + missingVariantSentence);
    }
  }
}

export default VaryDSL;
