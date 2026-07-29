import {
  HttpClient,
} from '@angular/common/http';

import {
  Injectable,
} from '@angular/core';

import type {
  LessonProgressStatus,
  RoadmapMilestone,
  SavedRoadmap,
  SavedRoadmapSummary,
} from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class RoadmapService {
  constructor(
    private readonly http:
      HttpClient,
  ) {}

  list() {
    return this.http.get<{
      roadmaps:
        SavedRoadmapSummary[];
    }>(
      '/api/roadmaps',
    );
  }

  saveAssessment(
    assessmentId: string,
  ) {
    return this.http.post<{
      roadmapId: string;
      alreadySaved: boolean;
    }>(
      `/api/roadmaps/from-assessment/${assessmentId}`,
      {},
    );
  }

  get(
    id: string,
  ) {
    return this.http.get<{
      roadmap: SavedRoadmap;
    }>(
      `/api/roadmaps/${id}`,
    );
  }

  setMilestoneStatus(
    roadmapId: string,
    milestoneId: string,
    status:
      Exclude<
        LessonProgressStatus,
        'SKIPPED'
      >,
  ) {
    return this.http.patch<{
      milestone:
        RoadmapMilestone;

      milestones:
        RoadmapMilestone[];
    }>(
      `/api/roadmaps/${roadmapId}/milestones/${milestoneId}`,
      {
        status,
      },
    );
  }

  delete(
    id: string,
  ) {
    return this.http.delete<void>(
      `/api/roadmaps/${id}`,
    );
  }
}
