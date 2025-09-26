import React, { useMemo, useState } from 'react';
import { AssertionFinding } from '../types';

interface Props { findings: AssertionFinding[]; }

const severityColor: Record<string, string> = { critical: '#b71c1c', high: '#d32f2f', medium: '#ed6c02', low: '#0288d1' };
const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export const FindingsTable: React.FC<Props> = ({ findings }) => {
  const [filter, setFilter] = useState<string[]>([]); // empty = all
  const [sortKey, setSortKey] = useState<'severity' | 'rule' | 'file' | 'line'>('severity');
  const [sortDir, setSortDir] = useState<1 | -1>(-1); // -1 desc default for severity

  const toggleFilter = (sev: string) => setFilter((f: string[]) => f.includes(sev) ? f.filter((s: string) => s!==sev) : [...f, sev]);
  const changeSort = (k: typeof sortKey) => {
    if (k === sortKey) {
      setSortDir(prev => (prev === 1 ? -1 : 1));
    } else {
      setSortKey(k);
      setSortDir(k === 'severity' ? -1 : 1);
    }
  };

  const severitiesPresent = Array.from(new Set(findings.map((f: AssertionFinding) => f.severity)));
  const visible = useMemo(() => {
    let list = filter.length ? findings.filter((f: AssertionFinding) => filter.includes(f.severity)) : findings.slice();
    list.sort((a: AssertionFinding,b: AssertionFinding) => {
      switch (sortKey) {
        case 'severity': return (severityRank[a.severity]||0 - (severityRank[b.severity]||0)) * sortDir;
        case 'rule': return a.rule_id.localeCompare(b.rule_id) * sortDir;
        case 'file': return (a.file||'').localeCompare(b.file||'') * sortDir;
        case 'line': return ((a.line||0) - (b.line||0)) * sortDir;
      }
    });
    return list;
  }, [findings, filter, sortKey, sortDir]);

  if (!findings.length) return <div className="panel"><h3>Findings</h3><div>No findings ✅</div></div>;
  return <div className="panel findings">
    <h3>Findings ({visible.length}/{findings.length})</h3>
    <div className="toolbar small">
      <span>Filter:</span>
      {severitiesPresent.map(sev => <label key={sev} className={filter.includes(sev)?'on':''}>
        <input type="checkbox" checked={filter.includes(sev)} onChange={()=>toggleFilter(sev)} /> {sev}
      </label>)}
      <span style={{marginLeft:'auto'}}>Sort:
        <button className="link" onClick={()=>changeSort('severity')}>Severity</button>
        <button className="link" onClick={()=>changeSort('rule')}>Rule</button>
        <button className="link" onClick={()=>changeSort('file')}>File</button>
        <button className="link" onClick={()=>changeSort('line')}>Line</button>
      </span>
    </div>
    <table>
      <thead><tr><th>Rule</th><th>Severity</th><th>File</th><th>Path</th><th>Message</th><th>Line</th></tr></thead>
      <tbody>
        {visible.map((f,i) => <tr key={i}>
          <td title={f.remediation || ''}>{f.rule_id}</td>
          <td><span style={{ color: severityColor[f.severity] || '#9ca3af' }}>{f.severity}</span></td>
          <td>{f.file}</td>
          <td>{f.path}</td>
          <td>{f.message}</td>
          <td>{f.line || ''}</td>
        </tr>)}
      </tbody>
    </table>
    <details>
      <summary>Snippets</summary>
      {visible.map((f,i) => f.snippet && <div key={i} className="snippet-block"><b>{f.file}:{f.line}</b><pre>{f.snippet}</pre></div>)}
    </details>
  </div>;
};
