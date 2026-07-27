import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import type {Assessment, GeneratedRoadmap, Question, SkillLevel} from '../models/api.models';

@Injectable({providedIn: 'root'})
export class AssessmentService {
  constructor(private readonly http: HttpClient) {}

  start(trackSlug: string) {
    return this.http.post<{assessmentId: string}>('/api/assessments', {trackSlug});
  }

  get(id: string) {
    return this.http.get<{assessment: Assessment; questions: Question[]}>(`/api/assessments/${id}`);
  }

  submit(id: string, answers: Array<{questionId: string; optionId: string}>) {
    return this.http.post<{
      assessmentId: string;
      computedLevel: SkillLevel;
      totalScore: number;
      maximumScore: number;
    }>(`/api/assessments/${id}/submit`, {answers});
  }

  generated(id: string) {
    return this.http.get<{assessmentId: string; roadmap: GeneratedRoadmap}>(
      `/api/assessments/${id}/generated`,
    );
  }
}
