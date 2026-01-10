import type { Assignment } from './visitor';
import type { SplitRegistry } from './splitRegistry';

type Options = {
  assignment: Assignment;
  defaultVariant: string;
  splitRegistry: SplitRegistry;
  errorLogger: (message: string) => void;
};

export function vary(options: Options): { isDefaulted: boolean; variant: string } {
  const { assignment, defaultVariant } = options;
  const assignedVariant = assignment.variant;

  if (assignedVariant) {
    return { isDefaulted: false, variant: assignedVariant };
  } else {
    return { isDefaulted: true, variant: defaultVariant };
  }
}
