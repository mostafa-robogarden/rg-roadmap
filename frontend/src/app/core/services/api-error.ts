import {HttpErrorResponse} from '@angular/common/http';

export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return error.error?.error?.message ?? error.message ?? 'The request failed.';
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}
