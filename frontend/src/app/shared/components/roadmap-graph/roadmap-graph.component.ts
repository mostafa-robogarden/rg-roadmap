import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';

import type {
  LessonProgressStatus,
  RoadmapGraphLesson,
  RoadmapGraphModule,
} from '../../../core/models/api.models';

export interface RoadmapStatusChange {
  lesson:
    RoadmapGraphLesson;

  status:
    Exclude<
      LessonProgressStatus,
      'SKIPPED'
    >;
}

@Component({
  selector:
    'app-roadmap-graph',

  standalone:
    true,

  imports: [
    CommonModule,
  ],

  templateUrl:
    './roadmap-graph.component.html',

  styleUrl:
    './roadmap-graph.component.scss',
})
export class RoadmapGraphComponent
  implements OnChanges {
  @Input()
  modules:
    RoadmapGraphModule[] = [];

  @Input()
  editable =
    false;

  @Input()
  readonlyMessage =
    'Save this roadmap to track your progress.';

  @Input()
  updatingIds:
    Set<string> = new Set<string>();

  @Output()
  statusChange =
    new EventEmitter<
      RoadmapStatusChange
    >();

  selectedLesson:
    RoadmapGraphLesson | null =
      null;

  ngOnChanges(): void {
    const lessons =
      this.flattenedLessons;

    if (!lessons.length) {
      this.selectedLesson =
        null;

      return;
    }

    const selectedKey =
      this.selectedLesson
        ? this.lessonKey(
            this.selectedLesson,
          )
        : null;

    if (selectedKey) {
      const refreshed =
        lessons.find(
          lesson =>
            this.lessonKey(
              lesson,
            ) === selectedKey,
        );

      if (refreshed) {
        this.selectedLesson =
          refreshed;

        return;
      }
    }

    this.selectedLesson =
      lessons.find(
        lesson =>
          lesson.status ===
          'IN_PROGRESS',
      ) ??
      lessons[0];
  }

  get flattenedLessons():
    RoadmapGraphLesson[] {
    return this.modules.flatMap(
      module =>
        module.lessons,
    );
  }

  select(
    lesson:
      RoadmapGraphLesson,
  ): void {
    this.selectedLesson =
      lesson;
  }

  start(
    lesson:
      RoadmapGraphLesson,
  ): void {
    this.statusChange.emit({
      lesson,
      status:
        'IN_PROGRESS',
    });
  }

  complete(
    lesson:
      RoadmapGraphLesson,
  ): void {
    this.statusChange.emit({
      lesson,
      status:
        'COMPLETED',
    });
  }

  reset(
    lesson:
      RoadmapGraphLesson,
  ): void {
    this.statusChange.emit({
      lesson,
      status:
        'NOT_STARTED',
    });
  }

  isUpdating(
    lesson:
      RoadmapGraphLesson,
  ): boolean {
    const key =
      lesson.databaseId ??
      lesson.lessonId;

    return this.updatingIds.has(
      key,
    );
  }

  lessonNumber(
    moduleIndex: number,
    lessonIndex: number,
  ): number {
    const earlierLessons =
      this.modules
        .slice(
          0,
          moduleIndex,
        )
        .reduce(
          (
            total,
            module,
          ) =>
            total +
            module.lessons.length,
          0,
        );

    return (
      earlierLessons +
      lessonIndex +
      1
    );
  }

  statusLabel(
    status:
      LessonProgressStatus,
  ): string {
    switch (status) {
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

  resourceName(
    resource: {
      label?: string;
      title?: string;
    },
  ): string {
    return (
      resource.label ??
      resource.title ??
      'Open guide'
    );
  }

  private lessonKey(
    lesson:
      RoadmapGraphLesson,
  ): string {
    return (
      lesson.databaseId ??
      lesson.lessonId
    );
  }
}
