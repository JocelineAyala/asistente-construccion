export type ProjectType = 'floor-plan' | 'consultation' | 'imperfection';

export type SavedProject = {
  id: string;
  userId: string;
  title: string;
  projectType: ProjectType;
  sketchPreviewUrl?: string;
  analysisJson?: string;
  consultationType?: string;
  description?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveProjectInput = {
  title: string;
  projectType: ProjectType;
  sketchPreview?: string;
  analysisJson?: string;
  consultationType?: string;
  description?: string;
  summary?: string;
};
