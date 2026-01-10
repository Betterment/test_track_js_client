import type { Assignment } from './visitor';
import { getSplitVariants, type SplitRegistry } from './splitRegistry';

type Handler = () => void;

export type Variants = {
  [variant: string]: Handler;
};

type Options = {
  assignment: Assignment;
  variants?: Variants;
  defaultVariant: string;
  splitRegistry: SplitRegistry;
  errorLogger: (message: string) => void;
};

function validateVariants({ variants, splitRegistry, assignment, errorLogger }: Options): void {
  if (!variants) return;

  const configuredVariants = Object.keys(variants);
  if (configuredVariants.length < 2) {
    throw new Error('must provide at least two variants');
  }

  const split = splitRegistry.getSplit(assignment.splitName);
  if (!split) return;

  const splitVariants = getSplitVariants(split);
  const unknownVariants = configuredVariants.filter(variant => !splitVariants.includes(variant));
  const missingVariants = splitVariants.filter(variant => !configuredVariants.includes(variant));

  if (unknownVariants.length > 0) {
    errorLogger(`configures unknown variants: ${unknownVariants.join(', ')}`);
  }

  if (missingVariants.length > 0) {
    errorLogger(`does not configure variants: ${missingVariants.join(', ')}`);
  }
}

export function vary(options: Options): { isDefaulted: boolean; variant: string } {
  validateVariants(options);

  const { assignment, variants, defaultVariant } = options;
  const assignedVariant = assignment.variant;

  if (variants && !variants[defaultVariant]) {
    throw new Error(`defaultVariant: ${defaultVariant} must be represented in variants object`);
  }

  if (assignedVariant && (!variants || variants[assignedVariant])) {
    variants?.[assignedVariant]?.();
    return { isDefaulted: false, variant: assignedVariant };
  } else {
    variants?.[defaultVariant]?.();
    return { isDefaulted: true, variant: defaultVariant };
  }
}
