import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  OnInit,
} from '@angular/core';

import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import {
  AuthService,
} from '../../../../core/auth/auth.service';

import type {
  GeneratedRoadmap,
  RoadmapGraphModule,
} from '../../../../core/models/api.models';

import {
  apiErrorMessage,
} from '../../../../core/services/api-error';

import {
  AssessmentService,
} from '../../../../core/services/assessment.service';

import {
  RoadmapService,
} from '../../../../core/services/roadmap.service';

import {
  RoadmapGraphComponent,
} from '../../../../shared/components/roadmap-graph/roadmap-graph.component';

@Component({
  selector:
    'app-generated-roadmap-page',

  standalone:
    true,

  imports: [
    CommonModule,
    RouterLink,
    RoadmapGraphComponent,
  ],

  templateUrl:
    './generated-roadmap-page.component.html',

  styleUrl:
    './generated-roadmap-page.component.scss',
})
export class GeneratedRoadmapPageComponent
  implements OnInit {
  assessmentId =
    '';

  roadmap:
    GeneratedRoadmap | null =
      null;

  loading =
    true;

  saving =
    false;

  error =
    '';

  viewMode:
    'list' | 'graph' =
      'graph';

  constructor(
    private readonly route:
      ActivatedRoute,

    private readonly router:
      Router,

    public readonly auth:
      AuthService,

    private readonly assessments:
      AssessmentService,

    private readonly roadmaps:
      RoadmapService,
  ) {}

  get graphModules():
    RoadmapGraphModule[] {
    const roadmap =
      this.roadmap;

    if (!roadmap) {
      return [];
    }

    if (
      roadmap.modules?.length
    ) {
      return roadmap.modules.map(
        (
          module,
          moduleIndex,
        ) => ({
          moduleId:
            module.moduleId,

          name:
            module.name,

          description:
            module.description,

          lessons:
            module.lessons.map(
              (
                lesson,
                lessonIndex,
              ) => ({
                lessonId:
                  lesson.lessonId,

                name:
                  lesson.name,

                description:
                  lesson.description ??
                  '',

                estimatedHours:
                  lesson.estimatedHours ??
                  null,

                xpReward:
                  lesson.xpReward ??
                  0,

                status:
                  lesson.status ??
                  (
                    moduleIndex === 0 &&
                    lessonIndex === 0
                      ? 'IN_PROGRESS'
                      : 'NOT_STARTED'
                  ),

                children:
                  lesson.children ??
                  [],

                resources:
                  lesson.resources ??
                  [],
              }),
            ),
        }),
      );
    }

    /*
     * Compatibility fallback for roadmaps still
     * returned in the old milestone format.
     */
    return [
      {
        moduleId:
          'legacy-roadmap',

        name:
          roadmap.track.title,

        description:
          roadmap.description,

        lessons:
          (
            roadmap.milestones ??
            []
          ).map(
            (
              milestone,
              index,
            ) => ({
              lessonId:
                milestone.publicLessonId ??
                milestone.id,

              name:
                milestone.title,

              description:
                milestone.description,

              estimatedHours:
                milestone.estimatedHours,

              xpReward:
                milestone.xpReward ??
                0,

              status:
                milestone.status ??
                (
                  index === 0
                    ? 'IN_PROGRESS'
                    : 'NOT_STARTED'
                ),

              children:
                milestone.children ??
                [],

              resources:
                milestone.resources,
            }),
          ),
      },
    ];
  }

  get roadmapSummary():
    string {
    return (
      this.roadmap?.summary ??
      this.roadmap?.description ??
      ''
    );
  }

  ngOnInit(): void {
    this.assessmentId =
      this.route.snapshot.paramMap.get(
        'assessmentId',
      ) ?? '';

    this.assessments
      .generated(
        this.assessmentId,
      )
      .subscribe({
        next: response => {
          this.roadmap =
            response.roadmap;

          this.loading =
            false;

          if (
            this.auth
              .isAuthenticated &&
            this.route.snapshot
              .queryParamMap
              .get('save') === '1'
          ) {
            this.save();
          }
        },

        error: error => {
          this.error =
            apiErrorMessage(
              error,
            );

          this.loading =
            false;
        },
      });
  }

  setView(
    view:
      'list' | 'graph',
  ): void {
    this.viewMode =
      view;
  }

  save(): void {
    if (this.saving) {
      return;
    }

    if (
      !this.auth
        .isAuthenticated
    ) {
      const returnUrl =
        `/generated/${this.assessmentId}?save=1`;

      void this.router.navigate(
        ['/login'],
        {
          queryParams: {
            returnUrl,
          },
        },
      );

      return;
    }

    this.saving =
      true;

    this.roadmaps
      .saveAssessment(
        this.assessmentId,
      )
      .subscribe({
        next: response =>
          void this.router.navigate(
            [
              '/roadmaps',
              response.roadmapId,
            ],
          ),

        error: error => {
          this.error =
            apiErrorMessage(
              error,
            );

          this.saving =
            false;
        },
      });
  }
}
