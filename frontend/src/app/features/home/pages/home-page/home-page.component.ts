import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {forkJoin} from 'rxjs';
import {AuthService} from '../../../../core/auth/auth.service';
import type {SavedRoadmapSummary, Track} from '../../../../core/models/api.models';
import {apiErrorMessage} from '../../../../core/services/api-error';
import {CatalogService} from '../../../../core/services/catalog.service';
import {RoadmapService} from '../../../../core/services/roadmap.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit {
  tracks: Track[] = [];
  roadmaps: SavedRoadmapSummary[] = [];
  loading = true;
  error = '';

  constructor(
    public readonly auth: AuthService,
    private readonly catalog: CatalogService,
    private readonly roadmapService: RoadmapService,
  ) {}

  ngOnInit(): void {
    const tracks$ = this.catalog.listTracks();
    if (this.auth.isAuthenticated) {
      forkJoin({tracks: tracks$, roadmaps: this.roadmapService.list()}).subscribe({
        next: ({tracks, roadmaps}) => {
          this.tracks = tracks.tracks;
          this.roadmaps = roadmaps.roadmaps;
          this.loading = false;
        },
        error: error => this.handleError(error),
      });
      return;
    }

    tracks$.subscribe({
      next: response => {
        this.tracks = response.tracks;
        this.loading = false;
      },
      error: error => this.handleError(error),
    });
  }

  progress(roadmap: SavedRoadmapSummary): number {
    return roadmap.milestoneCount
      ? Math.round((roadmap.completedCount / roadmap.milestoneCount) * 100)
      : 0;
  }

  private handleError(error: unknown): void {
    this.error = apiErrorMessage(error);
    this.loading = false;
  }
}
