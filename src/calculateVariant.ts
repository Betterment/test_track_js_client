import { md5 } from 'js-md5';
import Visitor from './visitor';
import { getSplitVariants, type SplitRegistry } from './splitRegistry';

export function getAssignmentBucket(visitor: Visitor, splitName: string): number {
  const hash = md5(`${splitName}${visitor.getId()}`);
  const hashFixnum = parseInt(hash.substring(0, 8), 16);
  return hashFixnum % 100;
}

type CalculateVariantOptions = {
  visitor: Visitor;
  splitRegistry: SplitRegistry;
  splitName: string;
};

export function calculateVariant({ visitor, splitRegistry, splitName }: CalculateVariantOptions): string | null {
  if (!splitRegistry.isLoaded) {
    return null;
  }

  const split = splitRegistry.getSplit(splitName);

  if (!split) {
    const message = `Unknown split: "${splitName}"`;
    visitor.logError(message);
    throw new Error(message);
  }

  let bucketCeiling = 0;
  const assignmentBucket = getAssignmentBucket(visitor, splitName);
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
