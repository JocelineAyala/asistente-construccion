import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import {
  getFirebaseDb,
  getFirebaseStorage,
  isFirebaseConfigured,
} from '../lib/firebase';
import { SaveProjectInput, SavedProject } from '../types/project';

function getLocalProjectsKey(userId: string) {
  return `buildassist:projects:${userId}`;
}

function readLocalProjects(userId: string): SavedProject[] {
  const raw = localStorage.getItem(getLocalProjectsKey(userId));
  if (!raw) return [];

  try {
    return JSON.parse(raw) as SavedProject[];
  } catch {
    return [];
  }
}

function writeLocalProjects(userId: string, projects: SavedProject[]) {
  try {
    localStorage.setItem(getLocalProjectsKey(userId), JSON.stringify(projects));
  } catch (error) {
    throw new Error(
      'No hay espacio en este navegador para guardar más proyectos. Configura Firebase en .env o libera espacio.',
    );
  }
}

export function isProjectCloudStorageEnabled(): boolean {
  return isFirebaseConfigured();
}

async function uploadSketchPreview(
  userId: string,
  projectId: string,
  sketchPreview?: string,
): Promise<string | undefined> {
  if (!sketchPreview || !isFirebaseConfigured()) {
    return sketchPreview;
  }

  if (!sketchPreview.startsWith('data:image')) {
    return sketchPreview;
  }

  const storageRef = ref(getFirebaseStorage(), `users/${userId}/projects/${projectId}/sketch.png`);
  await uploadString(storageRef, sketchPreview, 'data_url');
  return getDownloadURL(storageRef);
}

export async function saveUserProject(
  userId: string,
  input: SaveProjectInput,
): Promise<SavedProject> {
  const now = new Date().toISOString();
  const projectId = crypto.randomUUID();
  const sketchPreviewUrl = await uploadSketchPreview(userId, projectId, input.sketchPreview);

  const project: SavedProject = {
    id: projectId,
    userId,
    title: input.title,
    projectType: input.projectType,
    sketchPreviewUrl,
    analysisJson: input.analysisJson,
    consultationType: input.consultationType,
    description: input.description,
    summary: input.summary,
    createdAt: now,
    updatedAt: now,
  };

  if (isFirebaseConfigured()) {
    await setDoc(doc(getFirebaseDb(), 'users', userId, 'projects', projectId), project);
    return project;
  }

  const projects = readLocalProjects(userId);
  projects.unshift(project);
  writeLocalProjects(userId, projects);
  return project;
}

export async function listUserProjects(userId: string): Promise<SavedProject[]> {
  if (isFirebaseConfigured()) {
    const projectsQuery = query(
      collection(getFirebaseDb(), 'users', userId, 'projects'),
      orderBy('updatedAt', 'desc'),
    );
    const snapshot = await getDocs(projectsQuery);
    return snapshot.docs.map((item) => item.data() as SavedProject);
  }

  return readLocalProjects(userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getUserProject(
  userId: string,
  projectId: string,
): Promise<SavedProject | null> {
  if (isFirebaseConfigured()) {
    const snapshot = await getDoc(doc(getFirebaseDb(), 'users', userId, 'projects', projectId));
    return snapshot.exists() ? (snapshot.data() as SavedProject) : null;
  }

  return readLocalProjects(userId).find((project) => project.id === projectId) ?? null;
}
