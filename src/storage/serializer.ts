import { SurveyCADProject } from '../types/project';

export function serializeProject(project: SurveyCADProject): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectJson(jsonString: string): { project?: SurveyCADProject; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      return { error: 'Invalid file: Root element must be an object' };
    }
    if (data.format !== 'SurveyCAD') {
      return { error: 'Unsupported format: Expected SurveyCAD project file' };
    }
    if (!Array.isArray(data.points)) {
      return { error: 'Invalid project structure: Missing points list' };
    }
    return { project: data as SurveyCADProject };
  } catch (err) {
    return { error: `JSON Parse error: ${(err as Error).message}` };
  }
}

export function downloadProjectFile(project: SurveyCADProject): void {
  const json = serializeProject(project);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const safeName = project.metadata.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'survey_project';
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.surveycad`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
