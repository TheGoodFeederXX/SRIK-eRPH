import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useHashRoute } from './useHashRoute';

describe('useHashRoute', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('defaults to the record form', () => {
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.route.name).toBe('form');
  });

  it('maps hashes to views and back (audit T-05)', () => {
    const { result } = renderHook(() => useHashRoute());

    act(() => result.current.navigate({ name: 'records' }));
    expect(window.location.hash).toBe('#/rekod');

    act(() => result.current.navigate({ name: 'admin' }));
    expect(result.current.route.name).toBe('admin');

    act(() => result.current.navigate({ name: 'form', id: 'abc' }));
    expect(result.current.route).toEqual({ name: 'form', id: 'abc' });
  });

  it('reads deep links from the URL', () => {
    window.location.hash = '#/dskp';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.route.name).toBe('dskp');
  });
});
