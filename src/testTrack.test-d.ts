/* eslint-disable @typescript-eslint/unbound-method */

import { expectTypeOf, test } from 'vitest';
import type { TestTrack } from './testTrack';

describe('TestTrack', () => {
  const testTrack = {} as unknown as TestTrack;

  test('vary', () => {
    expectTypeOf(testTrack.vary).parameter(0).toBeString();
    expectTypeOf(testTrack.vary).parameter(1).toEqualTypeOf<{ context: string; defaultVariant: string | boolean }>();
    expectTypeOf(testTrack.vary).returns.toBeString();
  });

  test('ab', () => {
    expectTypeOf(testTrack.ab).parameter(0).toBeString();
    expectTypeOf(testTrack.ab).parameter(1).toEqualTypeOf<{ context: string; trueVariant?: string }>();
    expectTypeOf(testTrack.ab).returns.toBeBoolean();
  });

  test('logIn', () => {
    expectTypeOf(testTrack.logIn).parameter(0).toBeString();
    expectTypeOf(testTrack.logIn).parameter(1).toBeString();
    expectTypeOf(testTrack.logIn).returns.resolves.toBeVoid();
  });

  test('signUp', () => {
    expectTypeOf(testTrack.signUp).parameter(0).toBeString();
    expectTypeOf(testTrack.signUp).parameter(1).toBeString();
    expectTypeOf(testTrack.signUp).returns.resolves.toBeVoid();
  });
});

describe('TestTrack (typed)', () => {
  type ExampleSchema = {
    serializer_version: 1;
    identifier_types: [{ name: 'user_id' }, { name: 'agent_id' }];
    splits: [
      { name: 'foo_enabled'; weights: { true: 50; false: 50 } },
      { name: 'color_experiment'; weights: { green: 50; blue: 50 } }
    ];
  };

  const testTrack = {} as unknown as TestTrack<ExampleSchema>;

  test('vary', () => {
    expectTypeOf(testTrack.vary).parameter(0).toEqualTypeOf<'foo_enabled' | 'color_experiment'>();

    expectTypeOf(testTrack.vary<'foo_enabled'>)
      .parameter(1)
      .toEqualTypeOf<{ context: string; defaultVariant: 'true' | 'false' | boolean }>();

    expectTypeOf(testTrack.vary<'color_experiment'>)
      .parameter(1)
      .toEqualTypeOf<{ context: string; defaultVariant: 'green' | 'blue' }>();

    expectTypeOf(testTrack.vary).returns.toBeString();
  });

  test('ab', () => {
    expectTypeOf(testTrack.ab).parameter(0).toEqualTypeOf<'foo_enabled' | 'color_experiment'>();

    expectTypeOf(testTrack.ab<'foo_enabled'>)
      .parameter(1)
      .toEqualTypeOf<{ context: string; trueVariant?: 'true' | 'false' }>();

    expectTypeOf(testTrack.ab<'color_experiment'>)
      .parameter(1)
      .toEqualTypeOf<{ context: string; trueVariant?: 'green' | 'blue' }>();

    expectTypeOf(testTrack.ab).returns.toBeBoolean();
  });

  test('logIn', () => {
    expectTypeOf(testTrack.logIn).parameter(0).toEqualTypeOf<'user_id' | 'agent_id'>();
    expectTypeOf(testTrack.logIn).parameter(1).toBeString();
    expectTypeOf(testTrack.logIn).returns.resolves.toBeVoid();
  });

  test('signUp', () => {
    expectTypeOf(testTrack.signUp).parameter(0).toEqualTypeOf<'user_id' | 'agent_id'>();
    expectTypeOf(testTrack.signUp).parameter(1).toBeString();
    expectTypeOf(testTrack.signUp).returns.resolves.toBeVoid();
  });
});
