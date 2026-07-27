import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import type {Track} from '../../../../core/models/api.models';
import {apiErrorMessage} from '../../../../core/services/api-error';
import {AssessmentService} from '../../../../core/services/assessment.service';
import {CatalogService} from '../../../../core/services/catalog.service';

@Component({
  selector: 'app-track-details-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './track-details-page.component.html',
  styleUrl: './track-details-page.component.scss',
})
export class TrackDetailsPageComponent implements OnInit {
  track: Track | null = null;
  loading = true;
  starting = false;
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly catalog: CatalogService,
    private readonly assessments: AssessmentService,
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.catalog.getTrack(slug).subscribe({
      next: response => {
        this.track = response.track;
        this.loading = false;
      },
      error: error => {
        this.error = apiErrorMessage(error);
        this.loading = false;
      },
    });
  }

  start(): void {
    if (!this.track || this.starting) return;
    this.starting = true;
    this.assessments.start(this.track.slug).subscribe({
      next: response => void this.router.navigate(['/quiz', this.track!.slug], {queryParams: {assessmentId: response.assessmentId}}),
      error: error => {
        this.error = apiErrorMessage(error);
        this.starting = false;
      },
    });
  }
}
