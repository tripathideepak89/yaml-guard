import { PolicyDetail, PolicySummary, ValidationResult } from '../types';

const mockPolicies: PolicyDetail[] = [
  {
    id: 'core.yaml',
    name: 'Core Best Practices',
    category: 'k8s',
    path: 'policies/k8s/core.yaml',
    content: '# Example policy\n- id: ensure-image-tag\n  match: $.spec.containers[*].image\n  assert: contains(\":\")\n'
  }
];

const mockValidation: ValidationResult = {
  issues: [
    {
      ruleId: 'ensure-image-tag',
      severity: 'warn',
      message: 'Container image should pin a version tag instead of latest',
      path: '$.spec.containers[0].image',
      recommendation: 'Use a specific semantic version tag',
      status: 'fail'
    }
  ],
  summary: { error: 0, warn: 1, pass: 0 }
};

export const mockApi = {
  async listPolicies(): Promise<PolicySummary[]> {
    return mockPolicies.map(({ content, category, id, name, path }) => ({ id, name, category, path }));
  },
  async getPolicy(id: string): Promise<PolicyDetail> {
    return mockPolicies.find(p => p.id === id) || mockPolicies[0];
  },
  async validateYaml(_yaml: string, _policies?: string[]): Promise<ValidationResult> {
    return mockValidation;
  }
};
