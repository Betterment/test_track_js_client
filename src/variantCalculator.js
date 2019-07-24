import md5 from 'blueimp-md5';
import TestTrackConfig from './testTrackConfig';

var VariantCalculator = function(options) {
  this.visitor = options.visitor;
  this.splitName = options.splitName;

  if (!this.visitor) {
    throw new Error('must provide visitor');
  } else if (!this.splitName) {
    throw new Error('must provide splitName');
  }
};

VariantCalculator.prototype.getVariant = function() {
  if (TestTrackConfig.getSplitRegistry().isUnavailable()) {
    return null;
  }

  var bucketCeiling = 0,
    assignmentBucket = this.getAssignmentBucket(),
    weighting = this.getWeighting(),
    sortedVariants = this.getSortedVariants();

  for (var i = 0; i < sortedVariants.length; i++) {
    var variant = sortedVariants[i];

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
};

VariantCalculator.prototype.getSplitVisitorHash = function() {
  return md5(this.splitName + this.visitor.getId());
};

VariantCalculator.prototype.getHashFixnum = function() {
  return parseInt(this.getSplitVisitorHash().substr(0, 8), 16);
};

VariantCalculator.prototype.getAssignmentBucket = function() {
  return this.getHashFixnum() % 100;
};

VariantCalculator.prototype.getSortedVariants = function() {
  return this.getVariants().sort();
};

VariantCalculator.prototype.getVariants = function() {
  return Object.getOwnPropertyNames(this.getWeighting());
};

VariantCalculator.prototype.getWeighting = function() {
  var split = TestTrackConfig.getSplitRegistry().getSplit(this.splitName);

  if (!split) {
    var message = 'Unknown split: "' + this.splitName + '"';
    this.visitor.logError(message);
    throw new Error(message);
  }

  return split.getWeighting();
};

export default VariantCalculator;
