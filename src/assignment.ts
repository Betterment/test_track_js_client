import type { V1Assignment } from './client';

export type AssignmentOptions = {
  splitName: string;
  variant: string | null;
  context?: string;
  isUnsynced: boolean;
};

export class Assignment {
  static fromV1Assignment = (data: V1Assignment): Assignment => {
    return new Assignment({
      context: data.context,
      variant: data.variant,
      splitName: data.split_name,
      isUnsynced: data.unsynced
    });
  };

  readonly #splitName: string;
  #variant: string | null;
  #context: string | undefined;
  #isUnsynced: boolean;

  constructor(options: AssignmentOptions) {
    this.#splitName = options.splitName;
    this.#variant = options.variant;
    this.#context = options.context;
    this.#isUnsynced = options.isUnsynced;
  }

  get splitName(): string {
    return this.#splitName;
  }

  get variant(): string | null {
    return this.#variant;
  }

  get context(): string | null {
    return this.#context ?? null;
  }

  /** @deprecated Use `.splitName` */
  getSplitName(): string {
    return this.#splitName;
  }

  /** @deprecated Use `.variant` */
  getVariant(): string | null {
    return this.#variant;
  }

  /** @deprecated No replacement */
  setVariant(variant: string): void {
    this.#variant = variant;
  }

  /** @deprecated Use `.context` */
  getContext(): string | undefined {
    return this.#context;
  }

  /** @deprecated No replacement */
  setContext(context: string): void {
    this.#context = context;
  }

  /** @deprecated No replacement */
  isUnsynced(): boolean {
    return this.#isUnsynced;
  }

  /** @deprecated No replacement */
  setUnsynced(unsynced: boolean): void {
    this.#isUnsynced = unsynced;
  }
}
