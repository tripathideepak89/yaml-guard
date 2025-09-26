import React from 'react';

export const EmptyState: React.FC<{ title?: string; detail?: string }> = ({ title = 'No Data', detail = 'Nothing to display yet.' }) => (
  <div className="empty-state" aria-live="polite">
    <p className="title">{title}</p>
    <p className="detail">{detail}</p>
  </div>
);
