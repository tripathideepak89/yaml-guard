import React, { useState, useEffect, useCallback } from 'react';
import { PolicyList } from './components/PolicyList';
import { PolicyViewer } from './components/PolicyViewer';
import { YamlEditor } from './components/YamlEditor';
import { FindingsTable } from './components/FindingsTable';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { validate, suggest } from './api/client';
import { AssertionFinding, SuggestionOut, FileIn } from './types';
import { applyUnifiedDiff } from './utils/patch';

const DOCS_KEY = 'yamlguard_docs_v1';
const RULES_KEY = 'yamlguard_rules_v1';

export const App: React.FC = () => {
  const [policySel, setPolicySel] = useState<{group: string; file: string} | null>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [docs, setDocs] = useState<FileIn[]>([{ path: 'example.yaml', content: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: demo\nspec:\n  containers:\n  - name: web\n    image: nginx:latest\n'}]);
  const [findings, setFindings] = useState<AssertionFinding[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionOut[]>([]);
  const [busy, setBusy] = useState(false);
  const [optimize, setOptimize] = useState(false);
  const [downloadReady, setDownloadReady] = useState<string>('');

  // ---- Persistence ----
  useEffect(() => {
    try {
      const d = localStorage.getItem(DOCS_KEY);
      if (d) { const parsed = JSON.parse(d); if (Array.isArray(parsed) && parsed.every(o => o.path && typeof o.content === 'string')) setDocs(parsed); }
      const r = localStorage.getItem(RULES_KEY);
      if (r) { const parsedR = JSON.parse(r); if (Array.isArray(parsedR)) setRules(parsedR); }
    } catch {/* ignore */}
  }, []);
  useEffect(() => { try { localStorage.setItem(DOCS_KEY, JSON.stringify(docs)); } catch {/* ignore */} }, [docs]);
  useEffect(() => { try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch {/* ignore */} }, [rules]);

  // ---- Actions ----
  const runValidate = async () => {
    setBusy(true); setSuggestions([]); setDownloadReady('');
    try { const resp = await validate({ files: docs, rules, optimize }); setFindings(resp.findings); } catch(e:any){ alert(e.message); } finally { setBusy(false); }
  };
  const runSuggest = async () => {
    setBusy(true);
    try { const resp = await suggest({ files: docs, rules, optimize: false }); setSuggestions(resp.suggestions); } catch(e:any){ alert(e.message); } finally { setBusy(false); }
  };
  const clearRules = () => setRules([]);

  // ---- Applying Suggestions ----
  const applySuggestion = useCallback((s: SuggestionOut) => {
  setDocs((prev: FileIn[]) => prev.map((f: FileIn) => {
      if (f.path !== s.file) return f;
      const patched = applyUnifiedDiff(f.content, s.diff) || f.content; 
      return { ...f, content: patched };
    }));
  }, []);
  const applyAllSuggestions = () => {
    // group by file path in current order
    let updated = [...docs];
  const byFile = suggestions.reduce<Record<string, SuggestionOut[]>>((acc: Record<string, SuggestionOut[]>, s: SuggestionOut) => { (acc[s.file] ||= []).push(s); return acc; }, {});
    updated = updated.map(f => {
      const list = byFile[f.path];
      if (!list) return f;
      let content = f.content;
      for (const s of list) { content = applyUnifiedDiff(content, s.diff) || content; }
      return { ...f, content };
    });
    setDocs(updated);
  };

  // ---- Download ----
  const prepareDownload = () => {
  const joined = docs.map((d: FileIn) => d.content.trimEnd()).join('\n---\n');
    const blob = new Blob([joined + '\n'], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    setDownloadReady(url);
  };
  useEffect(() => () => { if (downloadReady) URL.revokeObjectURL(downloadReady); }, [downloadReady]);

  return <div className="layout">
    <header>
      <h1>YAML Guard UI</h1>
      <div className="tagline">Local YAML security & policy assistant</div>
      <div style={{marginLeft:'auto', display:'flex', gap:'8px'}}>
        <button onClick={() => {
          if (!confirm('Reset session? This will clear in-browser YAML docs and loaded rules.')) return;
          try { localStorage.removeItem(DOCS_KEY); localStorage.removeItem(RULES_KEY); } catch {/* ignore */}
          setDocs([{ path: 'example.yaml', content: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: demo\nspec:\n  containers:\n  - name: web\n    image: nginx:latest\n'}]);
          setRules([]); setFindings([]); setSuggestions([]); setDownloadReady('');
        }}>Reset Session</button>
      </div>
    </header>
    <main>
      <aside>
        <PolicyList onSelect={(group,file)=> setPolicySel({group,file})} selected={policySel} />
        <PolicyViewer group={policySel?.group||null} file={policySel?.file||null} onAddRules={(r)=> setRules(prev => [...prev, ...r])} />
        <div className="panel">
          <h3>Loaded Rules ({rules.length})</h3>
          {rules.length>0 && <button onClick={clearRules}>Clear</button>}
          <ol className="rule-ids">{rules.map((r,i)=> <li key={i}>{r.id}</li>)}</ol>
        </div>
      </aside>
      <section className="work">
        <YamlEditor docs={docs} onChange={setDocs} onDocsAdded={(added)=> setDocs(prev=>[...prev, ...added])} />
        <div className="actions-row">
          <label><input type="checkbox" checked={optimize} onChange={e=> setOptimize(e.target.checked)} /> Optimize</label>
          <button onClick={runValidate} disabled={busy}>Validate</button>
            <button onClick={runSuggest} disabled={busy || !findings.length}>Suggest Fixes</button>
          <button onClick={applyAllSuggestions} disabled={!suggestions.length}>Apply All</button>
          <button onClick={prepareDownload} disabled={!docs.length}>Prep Download</button>
          {downloadReady && <a className="download-link" href={downloadReady} download="yamlguard.yaml">Download YAML</a>}
        </div>
        <FindingsTable findings={findings} />
        <SuggestionsPanel suggestions={suggestions} onApply={applySuggestion} />
      </section>
    </main>
    <footer>
  <span>Backend: {(import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8000'}</span>
      <span style={{opacity:.6}}>YAML Guard © 2025</span>
    </footer>
  </div>;
};
