import { useMutation } from '@tanstack/react-query';
import { validateYaml } from '../api/client';
import { ValidationResult } from '../types';

export function useValidate(onSuccess?: (r: ValidationResult) => void) {
  return useMutation({
    mutationFn: ({ yaml, policies }: { yaml: string; policies?: string[] }) => validateYaml(yaml, policies),
    onSuccess
  });
}
