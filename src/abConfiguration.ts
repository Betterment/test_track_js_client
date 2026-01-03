import Visitor from './visitor';

type Options = {
  splitName: string;
  trueVariant: string;
  visitor: Visitor;
};

export function getABVariants({ splitName, trueVariant, visitor }: Options) {
  const split = visitor.config.splitRegistry.getSplit(splitName);
  const splitVariants = split?.getVariants();

  if (splitVariants && splitVariants.length > 2) {
    visitor.logError(`A/B for ${splitName} configures split with more than 2 variants`);
  }

  const nonTrueVariants = splitVariants?.filter(v => v !== trueVariant) || [];
  const falseVariant = nonTrueVariants.length > 0 ? nonTrueVariants.sort()[0] : 'false';

  return { true: trueVariant, false: falseVariant };
}
