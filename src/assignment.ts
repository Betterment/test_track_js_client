import type { V1Assignment } from './client';

export type AssignmentOptions = {
  splitName: string;
  variant: string | null;
  context?: string;
  isUnsynced: boolean;
};

export default class Assignment {
  static fromV1Assignment = (data: V1Assignment): Assignment => {
    return new Assignment({
      context: data.context,
      variant: data.variant,
      splitName: data.split_name,
      isUnsynced: data.unsynced
    });
  };

  #splitName: string;
  #variant: string | null;
  #context: string | undefined;
  #isUnsynced: boolean;

  constructor(options: AssignmentOptions) {
    this.#splitName = options.splitName;
    this.#variant = options.variant;
    this.#context = options.context;
    this.#isUnsynced = options.isUnsynced;
  }

  getSplitName(): string {
    return this.#splitName;
  }

  getVariant(): string | null {
    return this.#variant;
  }

  setVariant(variant: string): void {
    this.#variant = variant;
  }

  getContext(): string | undefined {
    return this.#context;
  }

  setContext(context: string): void {
    this.#context = context;
  }

  isUnsynced(): boolean {
    return this.#isUnsynced;
  }

  setUnsynced(unsynced: boolean): void {
    this.#isUnsynced = unsynced;
  }
}
