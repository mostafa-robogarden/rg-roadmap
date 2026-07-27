import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import type {Assessment, Question} from '../../../../core/models/api.models';
import {apiErrorMessage} from '../../../../core/services/api-error';
import {AssessmentService} from '../../../../core/services/assessment.service';

@Component({
  selector: 'app-quiz-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-page.component.html',
  styleUrl: './quiz-page.component.scss',
})
export class QuizPageComponent implements OnInit {
  assessment: Assessment | null = null;
  questions: Question[] = [];
  answers = new Map<string, string>();
  currentIndex = 0;
  loading = true;
  submitting = false;
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly assessments: AssessmentService,
  ) {}

  get currentQuestion(): Question | null {
    return this.questions[this.currentIndex] ?? null;
  }

  get progress(): number {
    return this.questions.length ? Math.round(((this.currentIndex + 1) / this.questions.length) * 100) : 0;
  }

  get canContinue(): boolean {
    return Boolean(this.currentQuestion && this.answers.get(this.currentQuestion.id));
  }

  ngOnInit(): void {
    const assessmentId = this.route.snapshot.queryParamMap.get('assessmentId');
    if (!assessmentId) {
      this.error = 'This assessment link is missing its assessment ID. Return to the track and start again.';
      this.loading = false;
      return;
    }

    this.assessments.get(assessmentId).subscribe({
      next: response => {
        this.assessment = response.assessment;
        this.questions = response.questions;
        for (const answer of response.assessment.answers) {
          this.answers.set(answer.questionId, answer.optionId);
        }
        if (response.assessment.status === 'COMPLETED') {
          void this.router.navigate(['/results', response.assessment.id]);
          return;
        }
        this.loading = false;
      },
      error: error => {
        this.error = apiErrorMessage(error);
        this.loading = false;
      },
    });
  }

  choose(questionId: string, optionId: string): void {
    this.answers.set(questionId, optionId);
  }

  next(): void {
    if (!this.canContinue) return;
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
      return;
    }
    this.submit();
  }

  previous(): void {
    if (this.currentIndex > 0) this.currentIndex -= 1;
  }

  private submit(): void {
    if (!this.assessment || this.submitting || this.answers.size !== this.questions.length) return;
    this.submitting = true;
    const answers = this.questions.map(question => ({
      questionId: question.id,
      optionId: this.answers.get(question.id)!,
    }));
    this.assessments.submit(this.assessment.id, answers).subscribe({
      next: () => void this.router.navigate(['/results', this.assessment!.id]),
      error: error => {
        this.error = apiErrorMessage(error);
        this.submitting = false;
      },
    });
  }
}
