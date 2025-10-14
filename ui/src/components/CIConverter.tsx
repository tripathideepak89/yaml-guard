import React, { useState, useEffect } from 'react';
import { FileIn } from '../types';
import { detectCIFormat, convertWorkflow, CI_FORMATS, CIFormat, ConversionResult } from '../utils/ciConverter';

interface CIConverterProps {
  docs: FileIn[];
}

export const CIConverter: React.FC<CIConverterProps> = ({ docs }) => {
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [targetFormat, setTargetFormat] = useState<CIFormat | 'auto'>('auto');
  const [detectedFormat, setDetectedFormat] = useState<CIFormat | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  // Auto-detect format when document selection changes
  useEffect(() => {
    if (!selectedDoc) {
      setDetectedFormat(null);
      return;
    }

    const doc = docs.find(d => d.path === selectedDoc);
    if (!doc) return;

    const detection = detectCIFormat(doc.content);
    setDetectedFormat(detection.format);
    
    // Auto-select detected format as target if we're in auto mode
    if (targetFormat === 'auto' && detection.format) {
      setTargetFormat(detection.format);
    }
  }, [selectedDoc, docs, targetFormat]);

  // Cleanup download URL
  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const handleConvert = () => {
    setError('');
    setConversionResult(null);
    
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl('');
    }

    if (!selectedDoc) {
      setError('Please select a YAML document to convert');
      return;
    }

    if (targetFormat === 'auto') {
      setError('Please select a target format');
      return;
    }

    const doc = docs.find(d => d.path === selectedDoc);
    if (!doc) {
      setError('Selected document not found');
      return;
    }

    try {
      const result = convertWorkflow(doc.content, targetFormat);
      setConversionResult(result);

      // Create download URL
      const blob = new Blob([result.content], { 
        type: result.extension === 'groovy' ? 'text/plain' : 'text/yaml' 
      });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    }
  };

  const getFileName = () => {
    if (!conversionResult) return 'converted';
    
    const baseName = selectedDoc.replace(/\.[^/.]+$/, ''); // Remove extension
    switch (conversionResult.format) {
      case 'github':
        return `${baseName}-github.${conversionResult.extension}`;
      case 'gitlab':
        return `.gitlab-ci.${conversionResult.extension}`;
      case 'azure':
        return `azure-pipelines.${conversionResult.extension}`;
      case 'circleci':
        return `config.${conversionResult.extension}`;
      case 'jenkins':
        return `Jenkinsfile`;
      default:
        return `${baseName}.${conversionResult.extension}`;
    }
  };

  // Filter docs that might be CI/CD workflows
  const potentialCIDocs = docs.filter(doc => {
    const path = doc.path.toLowerCase();
    return path.includes('workflow') || 
           path.includes('pipeline') || 
           path.includes('ci') || 
           path.includes('jenkins') || 
           path.includes('.yml') || 
           path.includes('.yaml') ||
           detectCIFormat(doc.content).format !== null;
  });

  return (
    <div className="panel">
      <h3>CI/CD Workflow Converter</h3>
      
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
          Source Document:
        </label>
        <select 
          value={selectedDoc} 
          onChange={(e) => setSelectedDoc(e.target.value)}
          style={{ width: '100%', fontSize: '12px' }}
        >
          <option value="">Select a YAML document...</option>
          {potentialCIDocs.map(doc => (
            <option key={doc.path} value={doc.path}>
              {doc.path}
              {detectCIFormat(doc.content).format && 
                ` (${detectCIFormat(doc.content).format})`
              }
            </option>
          ))}
        </select>
      </div>

      {detectedFormat && (
        <div style={{ marginBottom: '12px', fontSize: '11px', color: '#10b981' }}>
          ✓ Detected: {CI_FORMATS.find(f => f.value === detectedFormat)?.label}
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
          Target Format:
        </label>
        <select 
          value={targetFormat} 
          onChange={(e) => setTargetFormat(e.target.value as CIFormat | 'auto')}
          style={{ width: '100%', fontSize: '12px' }}
        >
          <option value="auto">(auto-detect)</option>
          {CI_FORMATS.map(format => (
            <option key={format.value} value={format.value}>
              {format.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <button 
          onClick={handleConvert}
          disabled={!selectedDoc || targetFormat === 'auto'}
          style={{ width: '100%' }}
        >
          Convert Workflow
        </button>
      </div>

      {error && (
        <div className="error" style={{ marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {conversionResult && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px' 
          }}>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>
              Converted to {CI_FORMATS.find(f => f.value === conversionResult.format)?.label}:
            </span>
            {downloadUrl && (
              <a 
                href={downloadUrl} 
                download={getFileName()}
                className="download-link"
                style={{ fontSize: '11px' }}
              >
                Download
              </a>
            )}
          </div>
          
          <div className="code-block" style={{ maxHeight: '300px', fontSize: '11px' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {conversionResult.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};