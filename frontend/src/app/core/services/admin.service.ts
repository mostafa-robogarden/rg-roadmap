import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import type {
  AnalyticsSummary,
  Question,
  RoadmapTemplate,
  SkillLevel,
  Track,
} from '../models/api.models';

export interface QuestionInput {
  trackId?: string | null;
  prompt: string;
  sortOrder: number;
  isActive: boolean;
  options: Array<{label: string; value: string; score: number; sortOrder: number}>;
}

export interface TemplateInput {
  trackId: string;
  level: SkillLevel;
  title: string;
  description: string;
  isActive: boolean;
  milestones: Array<{
    sortOrder: number;
    title: string;
    description: string;
    estimatedHours: number | null;
    resources: Array<{label: string; url: string}>;
  }>;
}

@Injectable({providedIn: 'root'})
export class AdminService {
  constructor(private readonly http: HttpClient) {}

  tracks() {
    return this.http.get<{tracks: Track[]}>('/api/admin/tracks');
  }
  createTrack(input: Omit<Track, 'id'>) {
    return this.http.post<{track: Track}>('/api/admin/tracks', input);
  }
  updateTrack(id: string, input: Partial<Omit<Track, 'id'>>) {
    return this.http.patch<{track: Track}>(`/api/admin/tracks/${id}`, input);
  }
  deleteTrack(id: string) {
    return this.http.delete<void>(`/api/admin/tracks/${id}`);
  }

  questions(trackId?: string) {
    const options = trackId ? {params: new HttpParams().set('trackId', trackId)} : {};
    return this.http.get<{questions: Question[]}>('/api/admin/questions', options);
  }
  createQuestion(input: QuestionInput) {
    return this.http.post<{question: Question}>('/api/admin/questions', input);
  }
  updateQuestion(id: string, input: QuestionInput) {
    return this.http.patch<{question: Question}>(`/api/admin/questions/${id}`, input);
  }
  deleteQuestion(id: string) {
    return this.http.delete<void | {archived: boolean}>(`/api/admin/questions/${id}`);
  }

  templates(trackId?: string) {
    const options = trackId ? {params: new HttpParams().set('trackId', trackId)} : {};
    return this.http.get<{templates: RoadmapTemplate[]}>('/api/admin/templates', options);
  }
  createTemplate(input: TemplateInput) {
    return this.http.post<{template: RoadmapTemplate}>('/api/admin/templates', input);
  }
  updateTemplate(id: string, input: TemplateInput) {
    return this.http.patch<{template: RoadmapTemplate}>(`/api/admin/templates/${id}`, input);
  }
  deleteTemplate(id: string) {
    return this.http.delete<void | {archived: boolean}>(`/api/admin/templates/${id}`);
  }

  analytics() {
    return this.http.get<{
      summary: AnalyticsSummary;
      events: Array<{eventName: string; count: number}>;
    }>('/api/admin/analytics');
  }
}
