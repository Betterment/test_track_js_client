import { getSplitVariants } from './split';
import Visitor from './visitor';
import type { SplitRegistry } from './splitRegistry';

type Options = {
  splitName: string;
  trueVariant: string;
  visitor: Visitor;
  splitRegistry: SplitRegistry;
};

export function getABVariants({ splitName, trueVariant, visitor, splitRegistry }: Options) {
  const split = splitRegistry.getSplit(splitName);
  const splitVariants = split && getSplitVariants(split);

  if (splitVariants && splitVariants.length > 2) {
    visitor.logError(`A/B for ${splitName} configures split with more than 2 variants`);
  }

  const nonTrueVariants = splitVariants?.filter(v => v !== trueVariant) || [];
  const falseVariant = nonTrueVariants.length > 0 ? nonTrueVariants.sort()[0] : 'false';

  return { true: trueVariant, false: falseVariant };
}
