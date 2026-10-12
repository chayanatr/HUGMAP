'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchPlaces } from './places';
import type { Place } from './types';

export type LoadStatus = 'loading' | 'ready' | 'error';

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setPlaces(await fetchPlaces());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { places, status, reload: load };
}
