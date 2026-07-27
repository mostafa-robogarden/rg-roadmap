import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import type {Track} from '../models/api.models';

@Injectable({providedIn: 'root'})
export class CatalogService {
  constructor(private readonly http: HttpClient) {}

  listTracks() {
    return this.http.get<{tracks: Track[]}>('/api/tracks');
  }

  getTrack(slug: string) {
    return this.http.get<{track: Track}>(`/api/tracks/${encodeURIComponent(slug)}`);
  }
}
