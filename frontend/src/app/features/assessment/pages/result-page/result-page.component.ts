import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import type {Assessment} from '../../../../core/models/api.models';
import {apiErrorMessage} from '../../../../core/services/api-error';
import {AssessmentService} from '../../../../core/services/assessment.service';

@Component({
  selector: 'app-result-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './result-page.component.html',
  styleUrl: './result-page.component.scss',
})
export class ResultPageComponent implements OnInit {
  assessment: Assessment | null = null;
  loading = true;
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly assessments: AssessmentService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('assessmentId') ?? '';
    this.assessments.get(id).subscribe({
      next: response => {
        this.assessment = response.assessment;
        this.loading = false;
      },
      error: error => {
        this.error = apiErrorMessage(error);
        this.loading = false;
      },
    });
  }

  description(level: string | null): string {
    if (level === 'COMPETENT') return 'You already have strong foundations. Your roadmap focuses on architecture, production quality, and advanced practice.';
    if (level === 'TINKERER') return 'You have practical exposure and are ready to strengthen weak spots while building larger, more independent projects.';
    return 'You are at the beginning of this journey. Your roadmap starts with clear foundations and grows through practical projects.';
  }
}
