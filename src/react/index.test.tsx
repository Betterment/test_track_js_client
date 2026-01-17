import { renderHook, waitFor } from '@testing-library/react';
import { createContext } from './index';
import { stub } from '../api';

const testTrack = stub();
const consoleError = vi.spyOn(console, 'error');

describe('createContext', () => {
  afterEach(() => {
    consoleError.mockReset();
  });

  it('provides TestTrack (async)', async () => {
    const { TestTrackProvider, useTestTrack } = createContext();

    const { result } = renderHook(useTestTrack, {
      wrapper: ({ children }) => <TestTrackProvider value={Promise.resolve(testTrack)}>{children}</TestTrackProvider>
    });

    expect(result.current).toBe(null);
    await waitFor(() => expect(result.current).toBe(testTrack));
  });

  it('provides TestTrack (sync)', async () => {
    const { TestTrackProvider, useTestTrack } = createContext();

    const { result } = renderHook(useTestTrack, {
      wrapper: ({ children }) => <TestTrackProvider value={testTrack}>{children}</TestTrackProvider>
    });

    // We could avoid this loading state, but we shouldn't. The `useTestTrack` hook
    // should behave the same regardless of how TestTrack was sourced. This forces
    // loading states to be tested and prevents tests from breaking if you switch
    // from sync to async.
    expect(result.current).toBe(null);
    await waitFor(() => expect(result.current).toBe(testTrack));
  });

  it('throws when used outside provider', () => {
    consoleError.mockImplementation(() => {});

    const { useTestTrack } = createContext();
    expect(() => renderHook(useTestTrack)).toThrow('useTestTrack() was not wrapped in <TestTrackProvider />');
  });

  it('throws when providers are nested', () => {
    consoleError.mockImplementation(() => {});

    const { TestTrackProvider, useTestTrack } = createContext();

    expect(() => {
      renderHook(useTestTrack, {
        wrapper: ({ children }) => (
          <TestTrackProvider value={testTrack}>
            <TestTrackProvider value={testTrack}>{children}</TestTrackProvider>
          </TestTrackProvider>
        )
      });
    }).toThrow('<TestTrackProvider /> was nested under another <TestTrackProvider />');
  });
});
