import {
  APP_INITIALIZER,
  ApplicationConfig,
} from '@angular/core';

import {
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';

import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {AuthService} from './core/auth/auth.service';
import {credentialsInterceptor} from './core/http/credentials.interceptor';

function initializeAuth(
  auth: AuthService,
): () => Promise<void> {
  return () => auth.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    provideHttpClient(
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),

      withInterceptors([
        credentialsInterceptor,
      ]),
    ),

    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
