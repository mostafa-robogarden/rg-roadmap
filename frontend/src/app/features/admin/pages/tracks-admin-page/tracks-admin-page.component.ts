import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink, RouterLinkActive} from '@angular/router';
import type {Track} from '../../../../core/models/api.models';
import {AdminService} from '../../../../core/services/admin.service';
import {apiErrorMessage} from '../../../../core/services/api-error';

@Component({
  selector: 'app-tracks-admin-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './tracks-admin-page.component.html',
  styleUrl: './tracks-admin-page.component.scss',
})
export class TracksAdminPageComponent implements OnInit {
  tracks: Track[] = [];
  editingId: string | null = null;
  error = '';
  message = '';
  readonly form = this.fb.nonNullable.group({
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    title: ['', Validators.required],
    category: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(10)]],
    isTrending: false,
    isPublished: true,
  });

  constructor(private readonly fb: FormBuilder, private readonly admin: AdminService) {}

  ngOnInit(): void { this.load(); }

  edit(track: Track): void {
    this.editingId = track.id;
    this.form.setValue({
      slug: track.slug,
      title: track.title,
      category: track.category,
      description: track.description,
      isTrending: track.isTrending,
      isPublished: track.isPublished,
    });
  }

  cancel(): void {
    this.editingId = null;
    this.form.reset({slug: '', title: '', category: '', description: '', isTrending: false, isPublished: true});
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const input = this.form.getRawValue();
    const request = this.editingId
      ? this.admin.updateTrack(this.editingId, input)
      : this.admin.createTrack(input);
    request.subscribe({
      next: () => {
        this.message = this.editingId ? 'Track updated.' : 'Track created.';
        this.cancel();
        this.load();
      },
      error: error => (this.error = apiErrorMessage(error)),
    });
  }

  remove(track: Track): void {
    if (!confirm(`Delete ${track.title}?`)) return;
    this.admin.deleteTrack(track.id).subscribe({
      next: () => this.load(),
      error: error => (this.error = apiErrorMessage(error)),
    });
  }

  private load(): void {
    this.admin.tracks().subscribe({
      next: response => (this.tracks = response.tracks),
      error: error => (this.error = apiErrorMessage(error)),
    });
  }
}
