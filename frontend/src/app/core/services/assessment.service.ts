import {
  HttpClient,
} from '@angular/common/http';

import {
  Injectable,
} from '@angular/core';

import type {
  Assessment,
  GeneratedRoadmap,
  Question,
  SkillLevel,
  StartAssessmentInput,
} from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class AssessmentService {
  constructor(
    private readonly http:
      HttpClient,
  ) {}

  start(
    input: StartAssessmentInput,
  ) {
    return this.http.post<{
      assessmentId: string;
    }>(
      '/api/assessments',
      input,
    );
  }

  get(
    id: string,
  ) {
    return this.http.get<{
      assessment: Assessment;
      questions: Question[];
    }>(
      `/api/assessments/${id}`,
    );
  }

  submit(
    id: string,

    answers: Array<{
      questionId: string;
      optionId: string;
    }>,
  ) {
    return this.http.post<{
      assessmentId: string;
      computedLevel: SkillLevel;
      totalScore: number;
      maximumScore: number;
    }>(
      `/api/assessments/${id}/submit`,
      {
        answers,
      },
    );
  }

  generated(
    id: string,
  ) {
    return this.http.get<{
      assessmentId: string;
      roadmap: GeneratedRoadmap;
    }>(
      `/api/assessments/${id}/generated`,
    );
  }
}
