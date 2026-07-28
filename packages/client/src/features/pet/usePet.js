import { useCallback, useEffect, useState } from 'react';
import { petApi } from './petApi.js';
import { loadDemoPet, runDemoAction } from './demoPet.js';

const isStaticDemo = import.meta.env.VITE_STATIC_DEMO === 'true';

export function usePet(userId) {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!userId) { setPet(null); setLoading(false); return; }
    setLoading(true);
    try {
      setPet(isStaticDemo ? loadDemoPet(userId) : await petApi.getPet(userId));
      setError(null);
    }
    catch (err) { setError(err); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const action = useCallback(async (name) => {
    try {
      const response = isStaticDemo ? runDemoAction(userId, name) : await petApi[name](userId);
      setPet(response.pet);
      setMessage(response.message);
      setTimeout(() => setMessage(''), 1800);
      setError(null);
    } catch (err) { setError(err); }
  }, [userId]);

  return { pet, loading, error, message, action, reload: load };
}
