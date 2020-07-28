import md5 from 'blueimp-md5';
import TestTrackConfig from './testTrackConfig';
import Visitor from './visitor';

export type VariantCalculatorOptions = {
  splitName: string;
  visitor: Visitor;
};

class VariantCalculator {
  visitor: Visitor;
  splitName: string;

  constructor(options: VariantCalculatorOptions) {
    this.visitor = options.visitor;
    this.splitName = options.splitName;

    if (!this.visitor) {
      throw new Error('must provide visitor');
    } else if (!this.splitName) {
      throw new Error('must provide splitName');
    }
  }

  getVariant() {
    if (!TestTrackConfig.getSplitRegistry().isLoaded()) {
      return null;
    }

    let bucketCeiling = 0;
    const assignmentBucket = this.getAssignmentBucket();
    const weighting = this.getWeighting();
    const sortedVariants = this.getSortedVariants();

    for (let i = 0; i < sortedVariants.length; i++) {
      const variant = sortedVariants[i];

      bucketCeiling += weighting[variant];
      if (bucketCeiling > assignmentBucket) {
        return variant;
      }
    }

    throw new Error(
      'Assignment bucket out of range. ' +
        assignmentBucket +
        ' unmatched in ' +
        this.splitName +
        ': ' +
        JSON.stringify(weighting)
    );
  }

  getSplitVisitorHash() {
    return md5(this.splitName + this.visitor.getId());
  }

  getHashFixnum() {
    return parseInt(this.getSplitVisitorHash().substr(0, 8), 16);
  }

  getAssignmentBucket() {
    return this.getHashFixnum() % 100;
  }

  getSortedVariants() {
    return this.getVariants().sort();
  }

  getVariants() {
    return Object.getOwnPropertyNames(this.getWeighting());
  }

  getWeighting() {
    const split = TestTrackConfig.getSplitRegistry().getSplit(this.splitName);

    if (!split) {
      const message = 'Unknown split: "' + this.splitName + '"';
      this.visitor.logError(message);
      throw new Error(message);
    }

    return split.getWeighting();
  }
}

export default VariantCalculator;
