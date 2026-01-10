import { getSplitVariants, type SplitRegistry } from './splitRegistry';

type Options = {
  splitName: string;
  splitRegistry: SplitRegistry;
  trueVariant: string;
  errorLogger: (message: string) => void;
};

export function getFalseVariant({ splitName, splitRegistry, trueVariant, errorLogger }: Options): string {
  const split = splitRegistry.getSplit(splitName);
  const splitVariants = split ? getSplitVariants(split) : [];

  if (splitVariants.length > 2) {
    errorLogger(`A/B for ${splitName} configures split with more than 2 variants`);
  }

  const otherVariants = splitVariants.filter(v => v !== trueVariant);
  return otherVariants.sort()[0] ?? 'false';
}
