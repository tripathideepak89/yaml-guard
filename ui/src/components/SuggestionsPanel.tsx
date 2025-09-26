import React from 'react';
import { SuggestionOut } from '../types';

interface Props { suggestions: SuggestionOut[]; onApply: (s: SuggestionOut) => void; }

export const SuggestionsPanel: React.FC<Props> = ({ suggestions, onApply }) => {
  return <div className="panel">
    <h3>Suggestions ({suggestions.length})</h3>
    {!suggestions.length && <div>No suggestions generated yet.</div>}
    {suggestions.map((s, i) => <div key={i} className="suggestion">
      <div className="suggestion-head">
        <strong>{s.title}</strong> <span className="file">{s.file}</span> <span className="confidence">{(s.confidence*100).toFixed(0)}%</span>
        <button style={{marginLeft:'auto'}} onClick={()=>onApply(s)}>Apply</button>
      </div>
      <div className="rationale">{s.rationale}</div>
      <details>
        <summary>Diff</summary>
        <pre className="diff">{s.diff}</pre>
      </details>
    </div>)}
  </div>;
};
