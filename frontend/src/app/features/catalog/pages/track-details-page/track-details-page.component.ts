import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  OnInit,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import type {
  Track,
} from '../../../../core/models/api.models';

import {
  apiErrorMessage,
} from '../../../../core/services/api-error';

import {
  AssessmentService,
} from '../../../../core/services/assessment.service';

import {
  CatalogService,
} from '../../../../core/services/catalog.service';

@Component({
  selector:
    'app-track-details-page',

  standalone: true,

  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
  ],

  templateUrl:
    './track-details-page.component.html',

  styleUrl:
    './track-details-page.component.scss',
})
export class TrackDetailsPageComponent
  implements OnInit {
  track: Track | null = null;

  loading = true;
  starting = false;
  error = '';

  readonly form =
    this.formBuilder.nonNullable.group({
      learnerGoal: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(500),
        ],
      ],

      weeklyHours: [
        8,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(40),
        ],
      ],

      targetMonths: [
        6,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(36),
        ],
      ],
    });

  constructor(
    private readonly route:
      ActivatedRoute,

    private readonly router:
      Router,

    private readonly formBuilder:
      FormBuilder,

    private readonly catalog:
      CatalogService,

    private readonly assessments:
      AssessmentService,
  ) {}

  ngOnInit(): void {
    const slug =
      this.route.snapshot.paramMap.get(
        'slug',
      ) ?? '';

    this.catalog
      .getTrack(slug)
      .subscribe({
        next: response => {
          this.track =
            response.track;

          this.loading =
            false;
        },

        error: error => {
          this.error =
            apiErrorMessage(error);

          this.loading =
            false;
        },
      });
  }

  start(): void {
    if (
      !this.track ||
      this.starting
    ) {
      return;
    }

    this.form.markAllAsTouched();

    if (
      this.form.invalid
    ) {
      return;
    }

    this.starting = true;
    this.error = '';

    const values =
      this.form.getRawValue();

    this.assessments
      .start({
        trackSlug:
          this.track.slug,

        learnerGoal:
          values.learnerGoal,

        weeklyHours:
          values.weeklyHours,

        targetMonths:
          values.targetMonths,
      })
      .subscribe({
        next: response => {
          void this.router.navigate(
            [
              '/quiz',
              this.track!.slug,
            ],

            {
              queryParams: {
                assessmentId:
                  response.assessmentId,
              },
            },
          );
        },

        error: error => {
          this.error =
            apiErrorMessage(error);

          this.starting =
            false;
        },
      });
  }
}
