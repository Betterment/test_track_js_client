import { md5 } from 'js-md5';
import { getSplitVariants, type SplitRegistry } from './splitRegistry';

type GetAssignmentBucketOptions = {
  splitName: string;
  visitorId: string;
};

type CalculateVariantOptions = {
  splitRegistry: SplitRegistry;
  splitName: string;
  visitorId: string;
};

export function getAssignmentBucket({ visitorId, splitName }: GetAssignmentBucketOptions): number {
  const hash = md5(`${splitName}${visitorId}`);
  const hashFixnum = parseInt(hash.substring(0, 8), 16);
  return hashFixnum % 100;
}

export function calculateVariant({ visitorId, splitRegistry, splitName }: CalculateVariantOptions): string | null {
  if (!splitRegistry.isLoaded) {
    return null;
  }

  const split = splitRegistry.getSplit(splitName);
  if (!split) {
    throw new Error(`Unknown split: "${splitName}"`);
  }

  let bucketCeiling = 0;
  const assignmentBucket = getAssignmentBucket({ splitName, visitorId });
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
