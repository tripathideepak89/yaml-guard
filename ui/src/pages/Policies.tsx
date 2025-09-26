import React, { useState } from 'react';
import { PoliciesList } from '../components/PoliciesList';
import { PolicyViewer } from '../components/PolicyViewer';
import { PolicySummary } from '../types';

export const Policies: React.FC = () => {
  const [selected, setSelected] = useState<PolicySummary | undefined>();
  return (
    <div className="page policies">
      <div className="policies-columns">
        <div className="list-col" aria-label="Policies list column">
          <PoliciesList onSelect={p => setSelected(p)} selectedId={selected?.id} />
        </div>
        <div className="viewer-col" aria-label="Policy viewer column">
          <PolicyViewer id={selected?.id} />
        </div>
      </div>
    </div>
  );
};
