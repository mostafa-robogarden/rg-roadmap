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

import type {
  LessonProgressStatus,
  RoadmapGraphModule,
  RoadmapMilestone,
  SavedRoadmap,
} from '../../../../core/models/api.models';

import {
  apiErrorMessage,
} from '../../../../core/services/api-error';

import {
  RoadmapService,
} from '../../../../core/services/roadmap.service';

import {
  RoadmapGraphComponent,
  type RoadmapStatusChange,
} from '../../../../shared/components/roadmap-graph/roadmap-graph.component';

@Component({
  selector:
    'app-saved-roadmap-page',

  standalone:
    true,

  imports: [
    CommonModule,
    RouterLink,
    RoadmapGraphComponent,
  ],

  templateUrl:
    './saved-roadmap-page.component.html',

  styleUrl:
    './saved-roadmap-page.component.scss',
})
export class SavedRoadmapPageComponent
  implements OnInit {
  roadmap:
    SavedRoadmap | null =
      null;

  loading =
    true;

  error =
    '';

  viewMode:
    'list' | 'graph' =
      'graph';

  updating =
    new Set<string>();

  constructor(
    private readonly route:
      ActivatedRoute,

    private readonly router:
      Router,

    private readonly roadmaps:
      RoadmapService,
  ) {}

  get progress():
    number {
    const milestones =
      this.roadmap?.milestones ??
      [];

    if (!milestones.length) {
      return 0;
    }

    const completed =
      milestones.filter(
        milestone =>
          this.milestoneStatus(
            milestone,
          ) ===
          'COMPLETED',
      ).length;

    return Math.round(
      (
        completed /
        milestones.length
      ) *
        100,
    );
  }

  get graphModules():
    RoadmapGraphModule[] {
    const milestones =
      this.roadmap?.milestones ??
      [];

    const groups =
      new Map<
        number,
        RoadmapGraphModule
      >();

    for (
      const milestone of
        milestones
    ) {
      const moduleOrder =
        milestone.moduleOrder ??
        1;

      if (
        !groups.has(
          moduleOrder,
        )
      ) {
        groups.set(
          moduleOrder,
          {
            moduleId:
              milestone.moduleId ??
              `module-${moduleOrder}`,

            name:
              milestone.moduleName ??
              `Module ${moduleOrder}`,

            description:
              milestone.moduleDescription ??
              undefined,

            lessons: [],
          },
        );
      }

      groups
        .get(moduleOrder)!
        .lessons.push({
          databaseId:
            milestone.id,

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
            this.milestoneStatus(
              milestone,
            ),

          children:
            milestone.children ??
            [],

          resources:
            milestone.resources ??
            [],
        });
    }

    return Array.from(
      groups.entries(),
    )
      .sort(
        ([first], [second]) =>
          first - second,
      )
      .map(
        ([, module]) => ({
          ...module,

          lessons:
            module.lessons.sort(
              (
                first,
                second,
              ) => {
                const firstRow =
                  milestones.find(
                    item =>
                      item.id ===
                      first.databaseId,
                  );

                const secondRow =
                  milestones.find(
                    item =>
                      item.id ===
                      second.databaseId,
                  );

                return (
                  (
                    firstRow
                      ?.lessonOrder ??
                    firstRow
                      ?.sortOrder ??
                    0
                  ) -
                  (
                    secondRow
                      ?.lessonOrder ??
                    secondRow
                      ?.sortOrder ??
                    0
                  )
                );
              },
            ),
        }),
      );
  }

  ngOnInit(): void {
    this.load();
  }

  setView(
    view:
      'list' | 'graph',
  ): void {
    this.viewMode =
      view;
  }

  onGraphStatusChange(
    event:
      RoadmapStatusChange,
  ): void {
    const milestoneId =
      event.lesson.databaseId;

    if (!milestoneId) {
      return;
    }

    this.updateStatus(
      milestoneId,
      event.status,
    );
  }

  toggle(
    milestone:
      RoadmapMilestone,
  ): void {
    const status =
      this.milestoneStatus(
        milestone,
      );

    this.updateStatus(
      milestone.id,

      status ===
      'COMPLETED'
        ? 'IN_PROGRESS'
        : 'COMPLETED',
    );
  }

  start(
    milestone:
      RoadmapMilestone,
  ): void {
    this.updateStatus(
      milestone.id,
      'IN_PROGRESS',
    );
  }

  statusLabel(
    milestone:
      RoadmapMilestone,
  ): string {
    switch (
      this.milestoneStatus(
        milestone,
      )
    ) {
      case 'IN_PROGRESS':
        return 'In progress';

      case 'COMPLETED':
        return 'Completed';

      case 'SKIPPED':
        return 'Skipped';

      default:
        return 'Not started';
    }
  }

  remove(): void {
    if (
      !this.roadmap ||
      !confirm(
        'Delete this saved roadmap?',
      )
    ) {
      return;
    }

    this.roadmaps
      .delete(
        this.roadmap.id,
      )
      .subscribe({
        next: () =>
          void this.router.navigateByUrl(
            '/',
          ),

        error: error =>
          this.error =
            apiErrorMessage(
              error,
            ),
      });
  }

  private updateStatus(
    milestoneId: string,

    status:
      Exclude<
        LessonProgressStatus,
        'SKIPPED'
      >,
  ): void {
    if (
      !this.roadmap ||
      this.updating.has(
        milestoneId,
      )
    ) {
      return;
    }

    this.updating.add(
      milestoneId,
    );

    this.error =
      '';

    this.roadmaps
      .setMilestoneStatus(
        this.roadmap.id,
        milestoneId,
        status,
      )
      .subscribe({
        next: response => {
          this.roadmap = {
            ...this.roadmap!,

            /*
             * Replace every row because the
             * backend may have skipped older
             * lessons or activated the next one.
             */
            milestones:
              response.milestones,
          };

          this.updating.delete(
            milestoneId,
          );
        },

        error: error => {
          this.error =
            apiErrorMessage(
              error,
            );

          this.updating.delete(
            milestoneId,
          );
        },
      });
  }

  private milestoneStatus(
    milestone:
      RoadmapMilestone,
  ): LessonProgressStatus {
    if (
      milestone.status
    ) {
      return milestone.status;
    }

    return milestone.completedAt
      ? 'COMPLETED'
      : 'NOT_STARTED';
  }

  private load(): void {
    const id =
      this.route.snapshot.paramMap.get(
        'id',
      ) ?? '';

    this.roadmaps
      .get(id)
      .subscribe({
        next: response => {
          this.roadmap =
            response.roadmap;

          this.loading =
            false;
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
}
