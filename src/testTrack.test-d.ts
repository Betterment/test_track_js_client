/* eslint-disable @typescript-eslint/unbound-method */

import { expectTypeOf, test } from 'vitest';
import { TestTrack } from './testTrack';

describe('TestTrack', () => {
  const testTrack: TestTrack = {} as unknown as TestTrack;

  test('vary', () => {
    expectTypeOf(testTrack.vary).parameter(0).toBeString();
    expectTypeOf(testTrack.vary).parameter(1).toEqualTypeOf<{ context: string; defaultVariant: string | boolean }>();
    expectTypeOf(testTrack.vary).returns.toBeString();
  });

  test('ab', () => {
    expectTypeOf(testTrack.ab).parameter(0).toBeString();
    expectTypeOf(testTrack.ab).parameter(1).toEqualTypeOf<{ context: string; trueVariant?: string }>();
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
