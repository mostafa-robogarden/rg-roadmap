import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink, RouterLinkActive} from '@angular/router';
import type {RoadmapTemplate, SkillLevel, Track} from '../../../../core/models/api.models';
import {AdminService, type TemplateInput} from '../../../../core/services/admin.service';
import {apiErrorMessage} from '../../../../core/services/api-error';

@Component({selector: 'app-templates-admin-page', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive], templateUrl: './templates-admin-page.component.html', styleUrl: './templates-admin-page.component.scss'})
export class TemplatesAdminPageComponent implements OnInit {
  tracks: Track[] = [];
  templates: RoadmapTemplate[] = [];
  editingId: string | null = null;
  error = '';
  readonly levels: SkillLevel[] = ['BEGINNER', 'TINKERER', 'COMPETENT'];
  readonly form = this.fb.nonNullable.group({
    trackId: ['', Validators.required],
    level: ['BEGINNER' as SkillLevel, Validators.required],
    title: ['', Validators.required],
    description: ['', Validators.required],
    isActive: true,
    milestonesText: ['', Validators.required],
  });

  constructor(private readonly fb: FormBuilder, private readonly admin: AdminService) {}
  ngOnInit(): void { this.admin.tracks().subscribe(response => (this.tracks = response.tracks)); this.load(); }

  edit(template: RoadmapTemplate): void {
    this.editingId = template.id;
    this.form.setValue({
      trackId: template.trackId,
      level: template.level,
      title: template.title,
      description: template.description,
      isActive: template.isActive,
      milestonesText: template.milestones.map(milestone => {
        const first = milestone.resources[0];
        return [milestone.title, milestone.description, milestone.estimatedHours ?? '', first?.label ?? '', first?.url ?? ''].join(' | ');
      }).join('\n'),
    });
  }

  cancel(): void { this.editingId = null; this.form.reset({trackId: '', level: 'BEGINNER', title: '', description: '', isActive: true, milestonesText: ''}); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    try {
      const raw = this.form.getRawValue();
      const input: TemplateInput = {
        trackId: raw.trackId,
        level: raw.level,
        title: raw.title,
        description: raw.description,
        isActive: raw.isActive,
        milestones: this.parseMilestones(raw.milestonesText),
      };
      const request = this.editingId ? this.admin.updateTemplate(this.editingId, input) : this.admin.createTemplate(input);
      request.subscribe({next: () => {this.cancel(); this.load();}, error: error => (this.error = apiErrorMessage(error))});
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Invalid milestone format.';
    }
  }

  remove(template: RoadmapTemplate): void {
    if (!confirm(`Delete or archive ${template.title}?`)) return;
    this.admin.deleteTemplate(template.id).subscribe({next: () => this.load(), error: error => (this.error = apiErrorMessage(error))});
  }

  private parseMilestones(value: string): TemplateInput['milestones'] {
    const lines = value.split('\n').map(line => line.trim()).filter(Boolean);
    if (!lines.length) throw new Error('Add at least one milestone.');
    return lines.map((line, index) => {
      const [title, description, hoursText, resourceLabel, resourceUrl] = line.split('|').map(item => item.trim());
      if (!title || !description) throw new Error(`Milestone line ${index + 1} needs a title and description.`);
      const resources = resourceLabel && resourceUrl ? [{label: resourceLabel, url: resourceUrl}] : [];
      return {sortOrder: index + 1, title, description, estimatedHours: hoursText ? Number(hoursText) : null, resources};
    });
  }

  private load(): void { this.admin.templates().subscribe({next: response => (this.templates = response.templates), error: error => (this.error = apiErrorMessage(error))}); }
}
