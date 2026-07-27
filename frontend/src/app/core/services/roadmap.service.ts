import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import type {RoadmapMilestone, SavedRoadmap, SavedRoadmapSummary} from '../models/api.models';

@Injectable({providedIn: 'root'})
export class RoadmapService {
  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get<{roadmaps: SavedRoadmapSummary[]}>('/api/roadmaps');
  }

  saveAssessment(assessmentId: string) {
    return this.http.post<{roadmapId: string; alreadySaved: boolean}>(
      `/api/roadmaps/from-assessment/${assessmentId}`,
      {},
    );
  }

  get(id: string) {
    return this.http.get<{roadmap: SavedRoadmap}>(`/api/roadmaps/${id}`);
  }

  setMilestone(roadmapId: string, milestoneId: string, completed: boolean) {
    return this.http.patch<{milestone: RoadmapMilestone}>(
      `/api/roadmaps/${roadmapId}/milestones/${milestoneId}`,
      {completed},
    );
  }

  delete(id: string) {
    return this.http.delete<void>(`/api/roadmaps/${id}`);
  }
}
