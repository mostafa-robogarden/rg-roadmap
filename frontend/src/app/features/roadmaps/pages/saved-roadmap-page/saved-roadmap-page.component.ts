import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import type {RoadmapMilestone, SavedRoadmap} from '../../../../core/models/api.models';
import {apiErrorMessage} from '../../../../core/services/api-error';
import {RoadmapService} from '../../../../core/services/roadmap.service';

@Component({
  selector: 'app-saved-roadmap-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './saved-roadmap-page.component.html',
  styleUrl: './saved-roadmap-page.component.scss',
})
export class SavedRoadmapPageComponent implements OnInit {
  roadmap: SavedRoadmap | null = null;
  loading = true;
  error = '';
  updating = new Set<string>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly roadmaps: RoadmapService,
  ) {}

  get progress(): number {
    if (!this.roadmap?.milestones.length) return 0;
    return Math.round(
      (this.roadmap.milestones.filter(milestone => milestone.completedAt).length /
        this.roadmap.milestones.length) *
        100,
    );
  }

  ngOnInit(): void {
    this.load();
  }

  toggle(milestone: RoadmapMilestone): void {
    if (!this.roadmap || this.updating.has(milestone.id)) return;
    this.updating.add(milestone.id);
    this.roadmaps.setMilestone(this.roadmap.id, milestone.id, !milestone.completedAt).subscribe({
      next: response => {
        milestone.completedAt = response.milestone.completedAt;
        this.updating.delete(milestone.id);
      },
      error: error => {
        this.error = apiErrorMessage(error);
        this.updating.delete(milestone.id);
      },
    });
  }

  remove(): void {
    if (!this.roadmap || !confirm('Delete this saved roadmap?')) return;
    this.roadmaps.delete(this.roadmap.id).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: error => (this.error = apiErrorMessage(error)),
    });
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.roadmaps.get(id).subscribe({
      next: response => {
        this.roadmap = response.roadmap;
        this.loading = false;
      },
      error: error => {
        this.error = apiErrorMessage(error);
        this.loading = false;
      },
    });
  }
}
