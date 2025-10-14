// CI/CD workflow converter utilities
import { load, dump } from 'js-yaml';

export type CIFormat = 'github' | 'gitlab' | 'azure' | 'circleci' | 'jenkins';

export interface ConversionResult {
  format: CIFormat;
  content: string;
  extension: string;
}

export interface DetectionResult {
  format: CIFormat | null;
  confidence: number;
}

// Auto-detect CI format from YAML content
export function detectCIFormat(yamlContent: string): DetectionResult {
  try {
    const parsed = load(yamlContent) as any;
    if (!parsed || typeof parsed !== 'object') {
      return { format: null, confidence: 0 };
    }

    // GitHub Actions detection
    if (parsed.jobs && (parsed.on || parsed.name)) {
      return { format: 'github', confidence: 0.95 };
    }

    // GitLab CI detection
    if (parsed.stages || (parsed.before_script && parsed.script) || Object.keys(parsed).some(k => k.includes(':'))) {
      const hasGitLabKeys = ['stages', 'before_script', 'after_script', 'variables', 'image'].some(k => k in parsed);
      if (hasGitLabKeys) {
        return { format: 'gitlab', confidence: 0.9 };
      }
    }

    // Azure Pipelines detection
    if (parsed.trigger !== undefined || parsed.pool || parsed.steps || parsed.jobs) {
      return { format: 'azure', confidence: 0.85 };
    }

    // CircleCI detection
    if (parsed.version && parsed.jobs && parsed.workflows) {
      return { format: 'circleci', confidence: 0.95 };
    }

    return { format: null, confidence: 0 };
  } catch {
    return { format: null, confidence: 0 };
  }
}

// Extract commands/scripts from source format
function extractCommands(parsed: any, sourceFormat: CIFormat): string[] {
  const commands: string[] = [];

  switch (sourceFormat) {
    case 'github':
      if (parsed.jobs) {
        Object.values(parsed.jobs).forEach((job: any) => {
          if (job.steps) {
            job.steps.forEach((step: any) => {
              if (step.run) {
                commands.push(step.run);
              }
            });
          }
        });
      }
      break;

    case 'gitlab':
      Object.entries(parsed).forEach(([key, value]: [string, any]) => {
        if (key !== 'stages' && key !== 'variables' && value && typeof value === 'object') {
          if (value.script) {
            if (Array.isArray(value.script)) {
              commands.push(...value.script);
            } else {
              commands.push(value.script);
            }
          }
        }
      });
      break;

    case 'azure':
      if (parsed.steps) {
        parsed.steps.forEach((step: any) => {
          if (step.script) {
            commands.push(step.script);
          }
        });
      }
      if (parsed.jobs) {
        Object.values(parsed.jobs).forEach((job: any) => {
          if (job.steps) {
            job.steps.forEach((step: any) => {
              if (step.script) {
                commands.push(step.script);
              }
            });
          }
        });
      }
      break;

    case 'circleci':
      if (parsed.jobs) {
        Object.values(parsed.jobs).forEach((job: any) => {
          if (job.steps) {
            job.steps.forEach((step: any) => {
              if (typeof step === 'string') {
                commands.push(step);
              } else if (step.run) {
                if (typeof step.run === 'string') {
                  commands.push(step.run);
                } else if (step.run.command) {
                  commands.push(step.run.command);
                }
              }
            });
          }
        });
      }
      break;
  }

  return commands.filter(cmd => cmd && cmd.trim());
}

// Convert to GitHub Actions format
function convertToGitHub(commands: string[], originalName: string): string {
  const workflow = {
    name: originalName || 'Converted Workflow',
    on: ['push', 'pull_request'],
    jobs: {
      build: {
        'runs-on': 'ubuntu-latest',
        steps: [
          { uses: 'actions/checkout@v4' },
          ...commands.map((cmd, i) => ({
            name: `Step ${i + 1}`,
            run: cmd
          }))
        ]
      }
    }
  };
  return dump(workflow, { indent: 2 });
}

// Convert to GitLab CI format
function convertToGitLab(commands: string[]): string {
  const pipeline = {
    stages: ['build'],
    build_job: {
      stage: 'build',
      script: commands
    }
  };
  return dump(pipeline, { indent: 2 });
}

// Convert to Azure Pipelines format
function convertToAzure(commands: string[]): string {
  const pipeline = {
    trigger: ['main'],
    pool: {
      vmImage: 'ubuntu-latest'
    },
    jobs: [{
      job: 'Build',
      steps: commands.map((cmd, i) => ({
        script: cmd,
        displayName: `Step ${i + 1}`
      }))
    }]
  };
  return dump(pipeline, { indent: 2 });
}

// Convert to CircleCI format
function convertToCircleCI(commands: string[]): string {
  const config = {
    version: 2.1,
    jobs: {
      build: {
        docker: [{ image: 'cimg/base:stable' }],
        steps: [
          'checkout',
          ...commands.map(cmd => ({ run: cmd }))
        ]
      }
    },
    workflows: {
      version: 2,
      build_workflow: {
        jobs: ['build']
      }
    }
  };
  return dump(config, { indent: 2 });
}

// Convert to Jenkins declarative pipeline
function convertToJenkins(commands: string[]): string {
  const stages = commands.map((cmd, i) => 
    `        stage('Step ${i + 1}') {\n            steps {\n                sh '''${cmd}'''\n            }\n        }`
  ).join('\n');

  return `pipeline {
    agent any
    
    stages {
${stages}
    }
}`;
}

// Main conversion function
export function convertWorkflow(yamlContent: string, targetFormat: CIFormat): ConversionResult {
  try {
    const parsed = load(yamlContent) as any;
    const detection = detectCIFormat(yamlContent);
    const sourceFormat = detection.format || 'github'; // fallback
    
    const originalName = parsed?.name || 'Converted Workflow';
    const commands = extractCommands(parsed, sourceFormat);

    let content: string;
    let extension: string;

    switch (targetFormat) {
      case 'github':
        content = convertToGitHub(commands, originalName);
        extension = 'yml';
        break;
      case 'gitlab':
        content = convertToGitLab(commands);
        extension = 'yml';
        break;
      case 'azure':
        content = convertToAzure(commands);
        extension = 'yml';
        break;
      case 'circleci':
        content = convertToCircleCI(commands);
        extension = 'yml';
        break;
      case 'jenkins':
        content = convertToJenkins(commands);
        extension = 'groovy';
        break;
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }

    return {
      format: targetFormat,
      content,
      extension
    };
  } catch (error) {
    throw new Error(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const CI_FORMATS: { value: CIFormat; label: string }[] = [
  { value: 'github', label: 'GitHub Actions' },
  { value: 'gitlab', label: 'GitLab CI' },
  { value: 'azure', label: 'Azure Pipelines' },
  { value: 'circleci', label: 'CircleCI' },
  { value: 'jenkins', label: 'Jenkins (Declarative)' }
];