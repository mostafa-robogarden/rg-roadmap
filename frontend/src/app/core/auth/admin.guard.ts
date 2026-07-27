import {inject} from '@angular/core';
import type {CanActivateFn} from '@angular/router';
import {Router} from '@angular/router';
import {AuthService} from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAdmin ? true : router.createUrlTree(['/']);
};
