import React from 'react';
import { usePolicyList } from '../hooks/usePolicies';
import { useHealth } from '../hooks/useHealth';

interface Props { onSelect: (group: string, file: string) => void; selected?: { group: string; file: string } | null }

export const PolicyList: React.FC<Props> = ({ onSelect, selected }) => {
  const { items, loading, error } = usePolicyList();
  const { status: health, detail: healthDetail, apiBase } = useHealth();
  const groups: Record<string, string[]> = {};
  items.forEach(p => { (groups[p.group] ||= []).push(p.file); });
  return <div className="panel">
    <h3>Policies</h3>
    <div className="small" style={{opacity:.75}}>
      API: {apiBase} – Health: {health}{health==='error' && healthDetail?` (${healthDetail})`:''}
    </div>
    {loading && <div>Loading policies...</div>}
    {error && <div className="error">{error}</div>}
    {Object.keys(groups).length === 0 && !loading && <div>No policies found</div>}
    {Object.entries(groups).map(([g, files]) => <div key={g} className="policy-group">
      <div className="group-name">{g}</div>
      <ul>
        {files.map(f => {
          const sel = selected && selected.group === g && selected.file === f;
          return <li key={f}>
            <button className={sel ? 'link selected' : 'link'} onClick={() => onSelect(g, f)}>{f}</button>
          </li>;
        })}
      </ul>
    </div>)}
  </div>;
};
