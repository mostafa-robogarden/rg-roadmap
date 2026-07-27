import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {AuthService} from '../../../../core/auth/auth.service';
import type {GeneratedRoadmap} from '../../../../core/models/api.models';
import {apiErrorMessage} from '../../../../core/services/api-error';
import {AssessmentService} from '../../../../core/services/assessment.service';
import {RoadmapService} from '../../../../core/services/roadmap.service';

@Component({
  selector: 'app-generated-roadmap-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './generated-roadmap-page.component.html',
  styleUrl: './generated-roadmap-page.component.scss',
})
export class GeneratedRoadmapPageComponent implements OnInit {
  assessmentId = '';
  roadmap: GeneratedRoadmap | null = null;
  loading = true;
  saving = false;
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly auth: AuthService,
    private readonly assessments: AssessmentService,
    private readonly roadmaps: RoadmapService,
  ) {}

  ngOnInit(): void {
    this.assessmentId = this.route.snapshot.paramMap.get('assessmentId') ?? '';
    this.assessments.generated(this.assessmentId).subscribe({
      next: response => {
        this.roadmap = response.roadmap;
        this.loading = false;
        if (this.auth.isAuthenticated && this.route.snapshot.queryParamMap.get('save') === '1') {
          this.save();
        }
      },
      error: error => {
        this.error = apiErrorMessage(error);
        this.loading = false;
      },
    });
  }

  save(): void {
    if (this.saving) return;
    if (!this.auth.isAuthenticated) {
      const returnUrl = `/generated/${this.assessmentId}?save=1`;
      void this.router.navigate(['/login'], {queryParams: {returnUrl}});
      return;
    }
    this.saving = true;
    this.roadmaps.saveAssessment(this.assessmentId).subscribe({
      next: response => void this.router.navigate(['/roadmaps', response.roadmapId]),
      error: error => {
        this.error = apiErrorMessage(error);
        this.saving = false;
      },
    });
  }
}
