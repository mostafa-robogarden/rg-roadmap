import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink, RouterLinkActive} from '@angular/router';
import type {Question, Track} from '../../../../core/models/api.models';
import {AdminService, type QuestionInput} from '../../../../core/services/admin.service';
import {apiErrorMessage} from '../../../../core/services/api-error';

@Component({selector: 'app-questions-admin-page', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive], templateUrl: './questions-admin-page.component.html', styleUrl: './questions-admin-page.component.scss'})
export class QuestionsAdminPageComponent implements OnInit {
  tracks: Track[] = [];
  questions: Question[] = [];
  editingId: string | null = null;
  error = '';
  readonly form = this.fb.nonNullable.group({
    trackId: [''],
    prompt: ['', Validators.required],
    sortOrder: [1, [Validators.required, Validators.min(1)]],
    isActive: true,
    option1: ['', Validators.required],
    option2: ['', Validators.required],
    option3: ['', Validators.required],
    option4: ['', Validators.required],
  });

  constructor(private readonly fb: FormBuilder, private readonly admin: AdminService) {}
  ngOnInit(): void { this.admin.tracks().subscribe(response => (this.tracks = response.tracks)); this.load(); }

  edit(question: Question): void {
    this.editingId = question.id;
    const labels = question.options.map(option => option.label);
    this.form.setValue({trackId: question.trackId ?? '', prompt: question.prompt, sortOrder: question.sortOrder, isActive: question.isActive ?? true, option1: labels[0] ?? '', option2: labels[1] ?? '', option3: labels[2] ?? '', option4: labels[3] ?? ''});
  }

  cancel(): void { this.editingId = null; this.form.reset({trackId: '', prompt: '', sortOrder: this.questions.length + 1, isActive: true, option1: '', option2: '', option3: '', option4: ''}); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    const labels = [raw.option1, raw.option2, raw.option3, raw.option4];
    const input: QuestionInput = {trackId: raw.trackId || null, prompt: raw.prompt, sortOrder: raw.sortOrder, isActive: raw.isActive, options: labels.map((label, index) => ({label, value: `option-${index}`, score: index, sortOrder: index + 1}))};
    const request = this.editingId ? this.admin.updateQuestion(this.editingId, input) : this.admin.createQuestion(input);
    request.subscribe({next: () => {this.cancel(); this.load();}, error: error => (this.error = apiErrorMessage(error))});
  }

  remove(question: Question): void {
    if (!confirm('Delete or archive this question?')) return;
    this.admin.deleteQuestion(question.id).subscribe({next: () => this.load(), error: error => (this.error = apiErrorMessage(error))});
  }

  private load(): void { this.admin.questions().subscribe({next: response => {this.questions = response.questions; if (!this.editingId) this.form.controls.sortOrder.setValue(this.questions.length + 1);}, error: error => (this.error = apiErrorMessage(error))}); }
}
