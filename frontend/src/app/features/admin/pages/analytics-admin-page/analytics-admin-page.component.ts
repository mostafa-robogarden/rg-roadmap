import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import type {AnalyticsSummary} from '../../../../core/models/api.models';
import {AdminService} from '../../../../core/services/admin.service';
import {apiErrorMessage} from '../../../../core/services/api-error';

@Component({selector: 'app-analytics-admin-page', standalone: true, imports: [CommonModule, RouterLink, RouterLinkActive], templateUrl: './analytics-admin-page.component.html', styleUrl: './analytics-admin-page.component.scss'})
export class AnalyticsAdminPageComponent implements OnInit {
  summary: AnalyticsSummary | null = null;
  events: Array<{eventName: string; count: number}> = [];
  error = '';
  constructor(private readonly admin: AdminService) {}
  ngOnInit(): void { this.admin.analytics().subscribe({next: response => {this.summary = response.summary; this.events = response.events;}, error: error => (this.error = apiErrorMessage(error))}); }
}
