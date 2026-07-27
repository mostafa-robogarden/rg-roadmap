const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:4002";

class CookieJar {
  private readonly cookies = new Map<string, string>();

  update(response: Response): void {
    const headersWithCookies = response.headers as Headers & { getSetCookie?: () => string[] };
    const values = headersWithCookies.getSetCookie?.() ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);
    for (const value of values) {
      const pair = value.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }

  header(): string {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }
}

async function request<T>(jar: CookieJar, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (jar.header()) headers.set("cookie", jar.header());
  if (init.body) headers.set("content-type", "application/json");
  const xsrf = jar.get("XSRF-TOKEN");
  if (xsrf && !["GET", "HEAD", "OPTIONS"].includes(init.method ?? "GET")) headers.set("x-xsrf-token", decodeURIComponent(xsrf));

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  jar.update(response);
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const guest = new CookieJar();
await request(guest, "/api/health");
await request(guest, "/api/auth/csrf");
const catalog = await request<{ tracks: Array<{ slug: string }> }>(guest, "/api/tracks");
if (!catalog.tracks.length) throw new Error("No tracks returned.");
const started = await request<{ assessmentId: string }>(guest, "/api/assessments", {
  method: "POST",
  body: JSON.stringify({ trackSlug: catalog.tracks[0].slug }),
});
const assessment = await request<{ questions: Array<{ id: string; options: Array<{ id: string }> }> }>(guest, `/api/assessments/${started.assessmentId}`);
const answers = assessment.questions.map((question) => ({ questionId: question.id, optionId: question.options[0].id }));
await request(guest, `/api/assessments/${started.assessmentId}/submit`, { method: "POST", body: JSON.stringify({ answers }) });
await request(guest, `/api/assessments/${started.assessmentId}/generated`);
await request(guest, "/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "learner@rgroadmap.local", password: "Roadmap123!" }),
});
const saved = await request<{ roadmapId: string }>(guest, `/api/roadmaps/from-assessment/${started.assessmentId}`, { method: "POST", body: "{}" });
const roadmap = await request<{ roadmap: { milestones: Array<{ id: string }> } }>(guest, `/api/roadmaps/${saved.roadmapId}`);
await request(guest, `/api/roadmaps/${saved.roadmapId}/milestones/${roadmap.roadmap.milestones[0].id}`, {
  method: "PATCH",
  body: JSON.stringify({ completed: true }),
});
await request(guest, "/api/auth/logout", { method: "POST", body: "{}" });

const admin = new CookieJar();
await request(admin, "/api/auth/csrf");
await request(admin, "/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "admin@rgroadmap.local", password: "Admin123!" }),
});
await request(admin, "/api/admin/analytics");
console.log("RG Roadmap backend smoke test passed.");
