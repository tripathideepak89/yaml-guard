import React from 'react';
import { YamlEditor } from '../components/YamlEditor';
import { FileDrop } from '../components/FileDrop';
import { useValidationContext } from '../context/ValidationContext';
import { useValidate } from '../hooks/useValidate';
import { ValidationResults } from '../components/ValidationResults';
import { Loading } from '../components/Loading';

export const Home: React.FC = () => {
  const { yamlText, setYamlText, lastResult, setLastResult, selectedPolicies } = useValidationContext();
  const validateMutation = useValidate(r => setLastResult(r));
  const onValidate = () => {
    validateMutation.mutate({ yaml: yamlText, policies: selectedPolicies.length ? selectedPolicies : undefined });
  };
  return (
    <div className="page home">
      <section className="input-section">
        <div className="upload-row">
          <FileDrop onLoaded={(content) => setYamlText(content)} />
          <button
            disabled={!yamlText || validateMutation.isPending}
            onClick={onValidate}
            className="btn primary validate-btn"
            aria-label="Validate YAML"
          >
            {validateMutation.isPending ? 'Validating…' : 'Validate'}
          </button>
        </div>
        <YamlEditor value={yamlText} onChange={setYamlText} />
      </section>
      <section className="results-section">
        {validateMutation.isPending && <Loading label="Validating" />}
        {lastResult && !validateMutation.isPending && <ValidationResults result={lastResult} />}
        {!lastResult && !validateMutation.isPending && (
          <p className="hint" aria-live="polite">Enter or upload YAML and click Validate to see results.</p>
        )}
      </section>
    </div>
  );
};
