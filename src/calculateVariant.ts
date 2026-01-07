import { md5 } from 'js-md5';
import Visitor from './visitor';
import { getSplitVariants, type SplitRegistry } from './splitRegistry';

type Options = {
  visitor: Visitor;
  splitRegistry: SplitRegistry;
  splitName: string;
};

export function getAssignmentBucket(visitor: Visitor, splitName: string): number {
  const hash = md5(`${splitName}${visitor.getId()}`);
  const hashFixnum = parseInt(hash.substring(0, 8), 16);
  return hashFixnum % 100;
}

export function calculateVariant({ visitor, splitRegistry, splitName }: Options): string | null {
  if (!splitRegistry.isLoaded) {
    return null;
  }

  const split = splitRegistry.getSplit(splitName);
  if (!split) {
    throw new Error(`Unknown split: "${splitName}"`);
  }

  let bucketCeiling = 0;
  const assignmentBucket = getAssignmentBucket(visitor, splitName);
  const weighting = split.weighting;
  const sortedVariants = getSplitVariants(split).sort();

  for (const variant of sortedVariants) {
    // @ts-expect-error `weighting[variant]` could be undefined
    bucketCeiling += weighting[variant];
    if (bucketCeiling > assignmentBucket) {
      return variant;
    }
  }

  throw new Error(
    `Assignment bucket out of range. ${assignmentBucket} unmatched in ${splitName}: ${JSON.stringify(weighting)}`
  );
}
