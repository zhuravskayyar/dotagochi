import { useCallback, useEffect, useState } from 'react';
import { petApi } from './petApi.js';

export function usePet(userId) {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await petApi.getPet(userId);
      setPet(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const feed = useCallback(async () => {
    const updated = await petApi.feed(userId);
    setPet(updated);
  }, [userId]);

  const play = useCallback(async () => {
    const updated = await petApi.play(userId);
    setPet(updated);
  }, [userId]);

  return { pet, loading, error, feed, play, reload: load };
}
