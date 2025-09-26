import { useEffect, useState } from 'react';
import { listPolicies, fetchPolicy } from '../api/client';
import { PolicyMeta } from '../types';

export function usePolicyList() {
  const [items, setItems] = useState<PolicyMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    listPolicies().then(r => setItems(r.policies)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  return { items, loading, error };
}

export function usePolicyFile(group: string | null, file: string | null) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!group || !file) return;
    setLoading(true);
    fetchPolicy(group, file).then(r => setContent(r.content)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [group, file]);
  return { content, loading, error };
}
