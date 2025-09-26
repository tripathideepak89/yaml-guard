import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPolicies } from '../api/client';
import { PolicySummary } from '../types';
import { Loading } from './Loading';
import { ErrorState } from './ErrorState';

interface Props { onSelect: (policy: PolicySummary) => void; selectedId?: string; }

export const PoliciesList: React.FC<Props> = ({ onSelect, selectedId }) => {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['policies'], queryFn: listPolicies });
  if (isLoading) return <Loading label="Loading policies" />;
  if (isError) return <ErrorState onRetry={() => refetch()} message="Failed to load policies" />;
  if (!data || !data.length) return <p>No policies found.</p>;
  return (
    <ul className="policy-list" aria-label="Policies list">
      {data.map(p => (
        <li key={p.id} className={p.id === selectedId ? 'active' : ''}>
          <button onClick={() => onSelect(p)} aria-pressed={p.id === selectedId}>
            <span className="name">{p.name}</span>
            <span className="meta">{p.category}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};
