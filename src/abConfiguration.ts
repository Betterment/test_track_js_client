import Visitor from './visitor';

export type ABConfigurationOptions = {
  splitName: string;
  trueVariant?: string;
  visitor: Visitor;
};

class ABConfiguration {
  private _splitName: string;
  private _trueVariant?: string;
  private _visitor: Visitor;

  constructor(options: ABConfigurationOptions) {
    if (!options.splitName) {
      throw new Error('must provide splitName');
    } else if (!options.hasOwnProperty('trueVariant')) {
      throw new Error('must provide trueVariant');
    } else if (!options.visitor) {
      throw new Error('must provide visitor');
    }

    this._splitName = options.splitName;
    this._trueVariant = options.trueVariant;
    this._visitor = options.visitor;
  }

  getVariants() {
    const splitVariants = this._getSplitVariants();
    if (splitVariants && splitVariants.length > 2) {
      this._visitor.logError('A/B for ' + this._splitName + ' configures split with more than 2 variants');
    }

    return {
      true: this._getTrueVariant(),
      false: this._getFalseVariant()
    };
  }

  _getTrueVariant() {
    return this._trueVariant || 'true';
  }

  _getFalseVariant() {
    const nonTrueVariants = this._getNonTrueVariants();
    return Array.isArray(nonTrueVariants) && nonTrueVariants.length !== 0 ? nonTrueVariants.sort()[0] : 'false';
  }

  _getNonTrueVariants() {
    const splitVariants = this._getSplitVariants();

    if (splitVariants) {
      const trueVariant = this._getTrueVariant();
      const trueVariantIndex = splitVariants.indexOf(trueVariant.toString());

      if (trueVariantIndex !== -1) {
        splitVariants.splice(trueVariantIndex, 1); // remove the true variant
      }

      return splitVariants;
    } else {
      return null;
    }
  }

  _getSplit() {
    return this._visitor.getSplitRegistry().getSplit(this._splitName);
  }

  _getSplitVariants() {
    return this._getSplit() && this._getSplit().getVariants();
  }
}

export default ABConfiguration;
