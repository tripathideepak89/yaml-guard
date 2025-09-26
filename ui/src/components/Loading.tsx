import React from 'react';

export const Loading: React.FC<{ label?: string }> = ({ label = 'Loading' }) => (
  <div role="status" aria-live="polite" className="loading">
    <span className="spinner" aria-hidden="true" /> {label}…
  </div>
);
