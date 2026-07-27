import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {BehaviorSubject, firstValueFrom, tap} from 'rxjs';
import type {User} from '../models/api.models';

@Injectable({providedIn: 'root'})
export class AuthService {
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  get user(): User | null {
    return this.userSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.user !== null;
  }

  get isAdmin(): boolean {
    return this.user?.role === 'ADMIN';
  }

  async initialize(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<{user: User | null}>('/api/auth/me'),
      );
      this.userSubject.next(response.user);
    } catch {
      this.userSubject.next(null);
    }
  }

  login(input: {email: string; password: string}) {
    return this.http
      .post<{user: User}>('/api/auth/login', input)
      .pipe(tap(response => this.userSubject.next(response.user)));
  }

  register(input: {name: string; email: string; password: string}) {
    return this.http
      .post<{user: User}>('/api/auth/register', input)
      .pipe(tap(response => this.userSubject.next(response.user)));
  }

  logout() {
    return this.http
      .post<void>('/api/auth/logout', {})
      .pipe(tap(() => this.userSubject.next(null)));
  }
}
