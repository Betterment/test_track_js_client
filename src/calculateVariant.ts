import { md5 } from 'js-md5';
import Visitor from './visitor';
import { getSplitVariants, type Split } from './split';

function getSplit(visitor: Visitor, splitName: string): Split {
  const split = visitor.config.splitRegistry.getSplit(splitName);

  if (!split) {
    const message = `Unknown split: "${splitName}"`;
    visitor.logError(message);
    throw new Error(message);
  }

  return split;
}

export function getAssignmentBucket(visitor: Visitor, splitName: string): number {
  const hash = md5(splitName + visitor.getId());
  const hashFixnum = parseInt(hash.substring(0, 8), 16);
  return hashFixnum % 100;
}

export function calculateVariant(visitor: Visitor, splitName: string): string | null {
  if (!visitor.config.splitRegistry.isLoaded) {
    return null;
  }

  let bucketCeiling = 0;
  const assignmentBucket = getAssignmentBucket(visitor, splitName);
  const split = getSplit(visitor, splitName);
  const weighting = split.weighting;
  const sortedVariants = getSplitVariants(split).sort();

  for (const variant of sortedVariants) {
    bucketCeiling += weighting[variant];
    if (bucketCeiling > assignmentBucket) {
      return variant;
    }
  }

  throw new Error(
    `Assignment bucket out of range. ${assignmentBucket} unmatched in ${splitName}: ${JSON.stringify(weighting)}`
  );
}
