import React, { useMemo } from 'react';
import { usePolicyFile } from '../hooks/usePolicies';
import yaml from 'js-yaml';

interface Props { group: string | null; file: string | null; onAddRules: (rules: any[]) => void; }

export const PolicyViewer: React.FC<Props> = ({ group, file, onAddRules }) => {
  const { content, loading, error } = usePolicyFile(group, file);
  const rules = useMemo(() => {
    if (!content) return [] as any[];
    try {
      const parsed = yaml.load(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [content]);

  return <div className="panel">
    <h3>Policy File</h3>
    {loading && <div>Loading...</div>}
    {error && <div className="error">{error}</div>}
    {content && <>
      <div className="actions"><button disabled={!rules.length} onClick={() => onAddRules(rules)}>Add {rules.length} rule(s)</button></div>
      <pre className="code-block">{content}</pre>
    </>}
  </div>;
};
