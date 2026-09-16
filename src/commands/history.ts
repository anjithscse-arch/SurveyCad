import { ICommand } from './command';
import { SurveyCADProject } from '../types/project';

export class CommandHistory {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxHistory: number = 100;

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoDescription(): string | null {
    return this.undoStack.length > 0
      ? this.undoStack[this.undoStack.length - 1].description
      : null;
  }

  get redoDescription(): string | null {
    return this.redoStack.length > 0
      ? this.redoStack[this.redoStack.length - 1].description
      : null;
  }

  execute(command: ICommand, project: SurveyCADProject): SurveyCADProject {
    const nextProject = command.execute(project);
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Any new action clears redo stack
    this.redoStack = [];
    return nextProject;
  }

  undo(project: SurveyCADProject): SurveyCADProject {
    if (!this.canUndo) return project;
    const command = this.undoStack.pop()!;
    const prevProject = command.undo(project);
    this.redoStack.push(command);
    return prevProject;
  }

  redo(project: SurveyCADProject): SurveyCADProject {
    if (!this.canRedo) return project;
    const command = this.redoStack.pop()!;
    const nextProject = command.execute(project);
    this.undoStack.push(command);
    return nextProject;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
