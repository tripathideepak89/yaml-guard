import React, { useCallback, useRef, useState } from 'react';

interface Doc { path: string; content: string; }
interface Props { docs: Doc[]; onChange: (docs: Doc[]) => void; onDocsAdded?: (docs: Doc[]) => void; }

export const YamlEditor: React.FC<Props> = ({ docs, onChange, onDocsAdded }) => {
  const update = (idx: number, field: keyof Doc, value: string) => {
    const next = docs.slice();
    (next[idx] as any)[field] = value;
    onChange(next);
  };
  const addDoc = () => onChange([...docs, { path: `file${docs.length+1}.yaml`, content: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: sample\nspec:\n  containers:\n  - name: app\n    image: nginx:latest\n' }]);
  const remove = (i: number) => onChange(docs.filter((_, idx) => idx !== i));

  // Drag & Drop
  const [dragOver, setDragOver] = useState(false);
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
  const files: File[] = Array.from(e.dataTransfer.files as any as File[]);
  const yamlFiles = files.filter((f: File) => /ya?ml$/i.test(f.name));
  if (!yamlFiles.length) return;
  Promise.all(yamlFiles.map((f: File) => f.text().then((t: string) => ({ path: f.name, content: t }))))
      .then(list => { onDocsAdded ? onDocsAdded(list) : onChange([...docs, ...list]); });
  };

  return <div className={"panel yaml-editor-panel"} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
    <h3>YAML Files</h3>
    <div className={dragOver ? 'drop-zone active' : 'drop-zone'}>
      <span>Drag & drop .yaml/.yml files here to import</span>
    </div>
    {docs.map((d, i) => <div key={i} className="yaml-doc">
      <div className="doc-header">
        <input value={d.path} onChange={e => update(i, 'path', e.target.value)} />
        <button onClick={() => remove(i)} title="Remove file">✕</button>
      </div>
      <textarea value={d.content} onChange={e => update(i, 'content', e.target.value)} rows={14} spellCheck={false} />
    </div>)}
    <button onClick={addDoc}>+ Add File</button>
  </div>;
};
