import Assignment from './assignment';
import Visitor from './visitor';

type Handler = () => void;

export type Variants = {
  [variant: string]: Handler;
};

type Options = {
  assignment: Assignment;
  visitor: Visitor;
  variants: Variants;
  defaultVariant: string;
};

function validateVariants(visitor: Visitor, assignment: Assignment, variants: Variants): void {
  const configuredVariants = Object.keys(variants);
  if (configuredVariants.length < 2) {
    throw new Error('must provide at least two variants');
  }

  const split = visitor.config.splitRegistry.getSplit(assignment.getSplitName());
  if (!split) return;

  const splitVariants = split.getVariants();
  const unknownVariants = configuredVariants.filter(variant => !splitVariants.includes(variant));
  const missingVariants = splitVariants.filter(variant => !configuredVariants.includes(variant));

  if (unknownVariants.length > 0) {
    visitor.logError(`configures unknown variants: ${unknownVariants.join(', ')}`);
  }

  if (missingVariants.length > 0) {
    visitor.logError(`does not configure variants: ${missingVariants.join(', ')}`);
  }
}

function validateDefaultVariant(variants: Variants, defaultVariant: string): void {
  if (!variants.hasOwnProperty(defaultVariant)) {
    throw new Error(`defaultVariant: ${defaultVariant} must be represented in variants object`);
  }
}

export function vary({ visitor, assignment, variants, defaultVariant }: Options) {
  validateVariants(visitor, assignment, variants);
  validateDefaultVariant(variants, defaultVariant);

  const assignedVariant = assignment.getVariant();

  if (assignedVariant && variants[assignedVariant]) {
    variants[assignedVariant]();
    return { isDefaulted: false };
  } else {
    variants[defaultVariant]();
    return { isDefaulted: true };
  }
}
