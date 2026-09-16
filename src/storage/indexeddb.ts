import { SurveyCADProject } from '../types/project';

const DB_NAME = 'SurveyCAD_DB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const AUTOSAVE_KEY = '__autosave_latest__';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Auto-save current project state into IndexedDB
 */
export async function saveAutosave(project: SurveyCADProject): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    store.put({ id: AUTOSAVE_KEY, project, savedAt: Date.now() });
  } catch (err) {
    console.warn('Autosave to IndexedDB failed, falling back to localStorage:', err);
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
    } catch (_) {}
  }
}

/**
 * Check if there is an autosaved project available for recovery
 */
export async function getAutosave(): Promise<SurveyCADProject | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.get(AUTOSAVE_KEY);
      req.onsuccess = () => {
        if (req.result && req.result.project) {
          resolve(req.result.project);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    const local = localStorage.getItem(AUTOSAVE_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (_) {}
    }
    return null;
  }
}

/**
 * Save a named project to storage
 */
export async function saveProject(project: SurveyCADProject): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_PROJECTS, 'readwrite');
  const store = tx.objectStore(STORE_PROJECTS);
  store.put({ id: project.metadata.id, project, savedAt: Date.now() });
}

/**
 * List all saved projects
 */
export async function listProjects(): Promise<{ id: string; name: string; date: string; pointCount: number }[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || [])
          .filter((item) => item.id !== AUTOSAVE_KEY && item.project)
          .map((item) => ({
            id: item.project.metadata.id,
            name: item.project.metadata.name,
            date: item.project.metadata.updatedAt || item.project.metadata.createdAt,
            pointCount: item.project.points?.length || 0,
          }));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch (_) {
    return [];
  }
}

/**
 * Load a named project from storage
 */
export async function loadProject(id: string): Promise<SurveyCADProject | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result?.project || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a project from storage
 */
export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_PROJECTS, 'readwrite');
  const store = tx.objectStore(STORE_PROJECTS);
  store.delete(id);
}
