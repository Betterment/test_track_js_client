import { createContext as createReactContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AnySchema } from '../schema';
import type { TestTrack } from '../testTrack';

type ContextValue<S extends AnySchema> = {
  testTrack: TestTrack<S> | null;
};

type Props<S extends AnySchema> = {
  value: Promise<TestTrack<S>> | TestTrack<S>;
  children: ReactNode;
};

export function createContext<S extends AnySchema>() {
  const Context = createReactContext<ContextValue<S> | null>(null);

  function TestTrackProvider({ value, children }: Props<S>) {
    const [contextValue, setContextValue] = useState<ContextValue<S>>({ testTrack: null });

    useEffect(() => {
      setContextValue({ testTrack: null });
      void Promise.resolve(value).then(testTrack => setContextValue({ testTrack }));
    }, [value]);

    if (useContext(Context)) {
      throw new Error('<TestTrackProvider /> was nested under another <TestTrackProvider />');
    }

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
  }

  function useTestTrack(): TestTrack<S> | null {
    const context = useContext(Context);
    if (!context) throw new Error('useTestTrack() was not wrapped in <TestTrackProvider />');
    return context.testTrack;
  }

  return { TestTrackProvider, useTestTrack };
}
