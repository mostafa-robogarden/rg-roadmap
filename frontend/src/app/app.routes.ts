import {Routes} from '@angular/router';

import {adminGuard} from './core/auth/admin.guard';
import {authGuard} from './core/auth/auth.guard';
import {guestGuard} from './core/auth/guest.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/pages/home-page/home-page.component').then(
        module => module.HomePageComponent,
      ),
    title: 'RG Roadmaps',
  },
  {
    path: 'tracks/:slug',
    loadComponent: () =>
      import(
        './features/catalog/pages/track-details-page/track-details-page.component'
      ).then(module => module.TrackDetailsPageComponent),
    title: 'Track Details',
  },
  {
    path: 'quiz/:trackSlug',
    loadComponent: () =>
      import(
        './features/assessment/pages/quiz-page/quiz-page.component'
      ).then(module => module.QuizPageComponent),
    title: 'Assessment',
  },
  {
    path: 'results/:assessmentId',
    loadComponent: () =>
      import(
        './features/assessment/pages/result-page/result-page.component'
      ).then(module => module.ResultPageComponent),
    title: 'Assessment Result',
  },
  {
    path: 'generated/:assessmentId',
    loadComponent: () =>
      import(
        './features/roadmaps/pages/generated-roadmap-page/generated-roadmap-page.component'
      ).then(module => module.GeneratedRoadmapPageComponent),
    title: 'Generated Roadmap',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then(
        module => module.LoginPageComponent,
      ),
    title: 'Login',
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import(
        './features/auth/pages/register-page/register-page.component'
      ).then(module => module.RegisterPageComponent),
    title: 'Create Account',
  },
  {
    path: 'roadmaps/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/roadmaps/pages/saved-roadmap-page/saved-roadmap-page.component'
      ).then(module => module.SavedRoadmapPageComponent),
    title: 'My Roadmap',
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/profile/pages/profile-page/profile-page.component'
      ).then(module => module.ProfilePageComponent),
    title: 'Profile',
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'tracks',
      },
      {
        path: 'tracks',
        loadComponent: () =>
          import(
            './features/admin/pages/tracks-admin-page/tracks-admin-page.component'
          ).then(module => module.TracksAdminPageComponent),
      },
      {
        path: 'questions',
        loadComponent: () =>
          import(
            './features/admin/pages/questions-admin-page/questions-admin-page.component'
          ).then(module => module.QuestionsAdminPageComponent),
      },
      {
        path: 'templates',
        loadComponent: () =>
          import(
            './features/admin/pages/templates-admin-page/templates-admin-page.component'
          ).then(module => module.TemplatesAdminPageComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import(
            './features/admin/pages/analytics-admin-page/analytics-admin-page.component'
          ).then(module => module.AnalyticsAdminPageComponent),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import(
        './shared/pages/not-found-page/not-found-page.component'
      ).then(module => module.NotFoundPageComponent),
    title: 'Page Not Found',
  },
];
