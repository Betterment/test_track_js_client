import Assignment from './assignment';
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
  logError: (message: string) => void;
};

function validateVariants({ variants, splitRegistry, assignment, logError }: Options): void {
  if (!variants) return;

  const configuredVariants = Object.keys(variants);
  if (configuredVariants.length < 2) {
    throw new Error('must provide at least two variants');
  }

  const split = splitRegistry.getSplit(assignment.getSplitName());
  if (!split) return;

  const splitVariants = getSplitVariants(split);
  const unknownVariants = configuredVariants.filter(variant => !splitVariants.includes(variant));
  const missingVariants = splitVariants.filter(variant => !configuredVariants.includes(variant));

  if (unknownVariants.length > 0) {
    logError(`configures unknown variants: ${unknownVariants.join(', ')}`);
  }

  if (missingVariants.length > 0) {
    logError(`does not configure variants: ${missingVariants.join(', ')}`);
  }
}

export function vary(options: Options): { isDefaulted: boolean; variant: string } {
  validateVariants(options);

  const { assignment, variants, defaultVariant } = options;
  const assignedVariant = assignment.getVariant();

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
