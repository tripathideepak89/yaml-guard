import React from 'react';

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({ message = 'Something went wrong', onRetry }) => (
  <div role="alert" className="error-state">
    <p>{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className="btn secondary">Retry</button>
    )}
  </div>
);
