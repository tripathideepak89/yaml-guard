import React, { useCallback, useState } from 'react';

interface Props { onLoaded: (content: string, file: File) => void; }

export const FileDrop: React.FC<Props> = ({ onLoaded }) => {
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const file = files[0];
    file.text().then(text => onLoaded(text, file));
  }, [onLoaded]);

  return (
    <div
      className={`file-drop ${dragging ? 'dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
    >
      <p>Drag & drop a YAML file here or</p>
      <label className="btn secondary" aria-label="Select YAML file">
        Browse
        <input type="file" accept=".yml,.yaml,application/x-yaml,text/yaml" hidden onChange={e => handleFiles(e.target.files)} />
      </label>
    </div>
  );
};
