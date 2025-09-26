import React from 'react';
import { ValidationResult } from '../types';
import classNames from 'classnames';

export const ValidationResults: React.FC<{ result: ValidationResult }> = ({ result }) => {
  const { issues, summary } = result;
  return (
    <div className="validation-results" aria-live="polite">
      <h3>Results</h3>
      <p className="summary">{summary.error} errors, {summary.warn} warnings, {summary.pass} passes</p>
      <table className="issues" role="table">
        <thead>
          <tr>
            <th scope="col">Rule</th>
            <th scope="col">Severity</th>
            <th scope="col">Message</th>
            <th scope="col">Path</th>
            <th scope="col">Recommendation</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((i, idx) => (
            <tr key={idx} className={classNames(i.severity, i.status)}>
              <td>{i.ruleId}</td>
              <td>{i.severity}</td>
              <td>{i.message}</td>
              <td>{i.path || '-'}</td>
              <td>{i.recommendation || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
