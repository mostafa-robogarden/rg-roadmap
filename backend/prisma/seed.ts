import argon2 from "argon2";
import { prisma } from "../src/lib/prisma.js";

type Level = "BEGINNER" | "TINKERER" | "COMPETENT";

type Resource = { label: string; url: string };
type MilestoneSeed = {
  title: string;
  description: string;
  hours: number;
  resources: Resource[];
};

const questionSeeds = [
  "How comfortable are you with programming fundamentals?",
  "How often have you built projects without following a full tutorial?",
  "How comfortable are you reading technical documentation?",
  "How confident are you debugging errors on your own?",
  "How familiar are you with Git and version control?",
  "How much time can you consistently study each week?",
  "How well do you understand APIs and data exchange?",
  "How comfortable are you with command-line tools?",
  "How much experience do you have testing your own work?",
  "Which statement best describes your immediate goal?",
];

const optionSets = [
  ["Not yet", "I know a few ideas", "I can use the basics", "I can explain and apply them"],
  ["Never", "Only guided exercises", "A few small projects", "Several independent projects"],
  ["I avoid it", "I can follow simple pages", "I use it regularly", "I navigate it confidently"],
  ["I usually get stuck", "I can fix simple issues", "I debug methodically", "I diagnose complex issues"],
  ["I have not used Git", "I know add/commit/push", "I use branches and pull requests", "I manage collaborative workflows"],
  ["Under 3 hours", "3–5 hours", "6–10 hours", "More than 10 hours"],
  ["No experience", "I know what an API is", "I have consumed APIs", "I have designed or built APIs"],
  ["I rarely use it", "I run copied commands", "I am comfortable navigating and scripting", "I automate workflows"],
  ["I test manually sometimes", "I follow checklists", "I write repeatable tests", "I design broader test strategies"],
  ["Explore the field", "Build a portfolio project", "Become job-ready", "Fill advanced knowledge gaps"],
];

const trackSeeds = [
  {
    slug: "front-end-development",
    title: "Front-End Development",
    category: "Web Development",
    description: "Build accessible, responsive web interfaces with HTML, CSS, JavaScript, TypeScript, and Angular.",
    isTrending: true,
  },
  {
    slug: "back-end-development",
    title: "Back-End Development",
    category: "Web Development",
    description: "Design APIs, databases, authentication, testing, and deployment using Node.js and PostgreSQL.",
    isTrending: true,
  },
  {
    slug: "devops-engineering",
    title: "DevOps Engineering",
    category: "Infrastructure",
    description: "Learn Linux, networking, containers, CI/CD, cloud foundations, monitoring, and infrastructure automation.",
    isTrending: false,
  },
];

const templates: Record<string, Record<Level, MilestoneSeed[]>> = {
  "front-end-development": {
    BEGINNER: [
      { title: "Web foundations", description: "Learn semantic HTML, forms, accessibility, and how browsers render pages.", hours: 18, resources: [{ label: "MDN Learn Web Development", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development" }] },
      { title: "CSS layouts", description: "Practice the box model, Flexbox, Grid, responsive design, and reusable styling.", hours: 22, resources: [{ label: "MDN CSS", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics" }] },
      { title: "JavaScript essentials", description: "Master variables, functions, arrays, objects, DOM events, and asynchronous code.", hours: 35, resources: [{ label: "JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" }] },
      { title: "TypeScript and tooling", description: "Use TypeScript, npm, Git, linting, and a modern build tool.", hours: 18, resources: [{ label: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" }] },
      { title: "Angular starter project", description: "Build a small Angular application with components, routing, forms, and an API.", hours: 35, resources: [{ label: "Angular Tutorials", url: "https://angular.dev/tutorials" }] },
    ],
    TINKERER: [
      { title: "Strengthen JavaScript", description: "Deepen your understanding of closures, modules, promises, and browser APIs.", hours: 20, resources: [{ label: "JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" }] },
      { title: "Advanced Angular patterns", description: "Use standalone components, RxJS, guards, interceptors, and reactive forms.", hours: 28, resources: [{ label: "Angular Guide", url: "https://angular.dev/overview" }] },
      { title: "State and API integration", description: "Design clean service layers, loading states, caching, and resilient error handling.", hours: 22, resources: [{ label: "RxJS", url: "https://rxjs.dev/guide/overview" }] },
      { title: "Testing and accessibility", description: "Add component tests, end-to-end coverage, keyboard support, and accessible semantics.", hours: 24, resources: [{ label: "Web Accessibility", url: "https://www.w3.org/WAI/fundamentals/accessibility-intro/" }] },
      { title: "Portfolio application", description: "Ship a polished data-driven application with authentication and responsive design.", hours: 45, resources: [{ label: "Angular Deployment", url: "https://angular.dev/tools/cli/deployment" }] },
    ],
    COMPETENT: [
      { title: "Architecture and design systems", description: "Design scalable feature boundaries, reusable UI primitives, and documentation.", hours: 24, resources: [{ label: "Angular Style Guide", url: "https://angular.dev/style-guide" }] },
      { title: "Performance engineering", description: "Profile rendering, optimize bundles, lazy-load features, and improve Core Web Vitals.", hours: 20, resources: [{ label: "web.dev Performance", url: "https://web.dev/learn/performance/" }] },
      { title: "Advanced testing", description: "Create reliable integration and end-to-end test strategies for critical flows.", hours: 20, resources: [{ label: "Testing Library", url: "https://testing-library.com/docs/" }] },
      { title: "Security and resilience", description: "Harden browser authentication, XSS defenses, CSP, and error recovery.", hours: 18, resources: [{ label: "OWASP Cheat Sheets", url: "https://cheatsheetseries.owasp.org/" }] },
      { title: "Production capstone", description: "Lead a production-quality front-end build with reviews, metrics, and deployment.", hours: 50, resources: [{ label: "Angular", url: "https://angular.dev/" }] },
    ],
  },
  "back-end-development": {
    BEGINNER: [
      { title: "Node.js and JavaScript foundations", description: "Learn modules, async programming, errors, npm, and TypeScript basics.", hours: 28, resources: [{ label: "Node.js Learn", url: "https://nodejs.org/en/learn" }] },
      { title: "HTTP and REST APIs", description: "Understand requests, responses, status codes, validation, and REST conventions.", hours: 22, resources: [{ label: "MDN HTTP", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP" }] },
      { title: "PostgreSQL fundamentals", description: "Model relational data and practice queries, joins, constraints, and indexes.", hours: 28, resources: [{ label: "PostgreSQL Tutorial", url: "https://www.postgresql.org/docs/current/tutorial.html" }] },
      { title: "Express and Prisma", description: "Build a layered CRUD API with Express, Prisma, migrations, and seed data.", hours: 32, resources: [{ label: "Express", url: "https://expressjs.com/" }, { label: "Prisma", url: "https://www.prisma.io/docs" }] },
      { title: "Authentication project", description: "Add secure passwords, sessions, authorization, tests, and deployment configuration.", hours: 38, resources: [{ label: "OWASP Authentication", url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html" }] },
    ],
    TINKERER: [
      { title: "API architecture", description: "Separate routes, services, repositories, validation, and centralized errors.", hours: 24, resources: [{ label: "Express Best Practices", url: "https://expressjs.com/en/advanced/best-practice-performance.html" }] },
      { title: "Database design and performance", description: "Use transactions, indexes, query plans, pagination, and data migrations.", hours: 28, resources: [{ label: "PostgreSQL", url: "https://www.postgresql.org/docs/" }] },
      { title: "Secure authentication", description: "Implement session rotation, CSRF defenses, rate limits, and role-based access.", hours: 24, resources: [{ label: "OWASP Session Management", url: "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html" }] },
      { title: "Automated testing", description: "Test services, API contracts, database behavior, and failure paths.", hours: 24, resources: [{ label: "Node Test Runner", url: "https://nodejs.org/api/test.html" }] },
      { title: "Deploy a production API", description: "Containerize, configure CI/CD, manage secrets, and add health and logging.", hours: 42, resources: [{ label: "Docker Get Started", url: "https://docs.docker.com/get-started/" }] },
    ],
    COMPETENT: [
      { title: "Distributed system foundations", description: "Study caching, queues, idempotency, consistency, and failure handling.", hours: 28, resources: [{ label: "AWS Builders Library", url: "https://aws.amazon.com/builders-library/" }] },
      { title: "Advanced PostgreSQL", description: "Tune queries, isolation levels, locking, partitioning, and operational backups.", hours: 28, resources: [{ label: "PostgreSQL Documentation", url: "https://www.postgresql.org/docs/" }] },
      { title: "Observability", description: "Add structured logs, metrics, traces, dashboards, and actionable alerts.", hours: 22, resources: [{ label: "OpenTelemetry", url: "https://opentelemetry.io/docs/" }] },
      { title: "Security engineering", description: "Perform threat modeling, dependency review, secret rotation, and abuse prevention.", hours: 22, resources: [{ label: "OWASP ASVS", url: "https://owasp.org/www-project-application-security-verification-standard/" }] },
      { title: "Production backend capstone", description: "Design and ship a resilient service with load tests and operational documentation.", hours: 55, resources: [{ label: "Node.js", url: "https://nodejs.org/" }] },
    ],
  },
  "devops-engineering": {
    BEGINNER: [
      { title: "Linux and shell basics", description: "Navigate Linux, manage files and processes, and automate repetitive shell tasks.", hours: 24, resources: [{ label: "Linux Journey", url: "https://linuxjourney.com/" }] },
      { title: "Networking foundations", description: "Understand DNS, TCP/IP, HTTP, ports, routing, and common diagnostics.", hours: 22, resources: [{ label: "Cloudflare Learning", url: "https://www.cloudflare.com/learning/" }] },
      { title: "Git and CI fundamentals", description: "Use branches and pull requests, then automate checks in a basic CI pipeline.", hours: 20, resources: [{ label: "GitHub Actions", url: "https://docs.github.com/en/actions" }] },
      { title: "Containers with Docker", description: "Build images, run containers, use Compose, and manage environment configuration.", hours: 28, resources: [{ label: "Docker Get Started", url: "https://docs.docker.com/get-started/" }] },
      { title: "Deploy a small service", description: "Deploy an application and database with health checks, logs, and rollback notes.", hours: 38, resources: [{ label: "Twelve-Factor App", url: "https://12factor.net/" }] },
    ],
    TINKERER: [
      { title: "Reliable CI/CD", description: "Build multi-stage pipelines with artifacts, environments, approvals, and rollback.", hours: 26, resources: [{ label: "GitHub Actions", url: "https://docs.github.com/en/actions" }] },
      { title: "Cloud foundations", description: "Learn identity, networking, compute, storage, databases, and cost awareness.", hours: 30, resources: [{ label: "AWS Skill Builder", url: "https://skillbuilder.aws/" }] },
      { title: "Infrastructure as code", description: "Provision repeatable infrastructure and manage state safely.", hours: 28, resources: [{ label: "Terraform", url: "https://developer.hashicorp.com/terraform/tutorials" }] },
      { title: "Monitoring and incident response", description: "Collect metrics and logs, define alerts, and practice incident reviews.", hours: 24, resources: [{ label: "Prometheus", url: "https://prometheus.io/docs/introduction/overview/" }] },
      { title: "Kubernetes foundations", description: "Deploy workloads, services, configuration, and health probes to Kubernetes.", hours: 38, resources: [{ label: "Kubernetes Basics", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/" }] },
    ],
    COMPETENT: [
      { title: "Platform architecture", description: "Design secure multi-environment platforms with reusable delivery patterns.", hours: 30, resources: [{ label: "CNCF Landscape", url: "https://landscape.cncf.io/" }] },
      { title: "Kubernetes operations", description: "Manage upgrades, policies, autoscaling, storage, and production troubleshooting.", hours: 34, resources: [{ label: "Kubernetes Documentation", url: "https://kubernetes.io/docs/" }] },
      { title: "SRE practices", description: "Define SLIs and SLOs, manage error budgets, and improve reliability systematically.", hours: 28, resources: [{ label: "Google SRE Books", url: "https://sre.google/books/" }] },
      { title: "Supply-chain security", description: "Secure CI/CD credentials, artifacts, images, dependencies, and deployment policies.", hours: 24, resources: [{ label: "SLSA", url: "https://slsa.dev/" }] },
      { title: "Production platform capstone", description: "Build an observable, automated platform and document recovery procedures.", hours: 60, resources: [{ label: "OpenTelemetry", url: "https://opentelemetry.io/" }] },
    ],
  },
};

async function main(): Promise<void> {
  await prisma.$transaction([
    prisma.webSession.deleteMany(),
    prisma.analyticsEvent.deleteMany(),
    prisma.savedMilestone.deleteMany(),
    prisma.savedRoadmap.deleteMany(),
    prisma.assessmentAnswer.deleteMany(),
    prisma.assessment.deleteMany(),
    prisma.templateMilestone.deleteMany(),
    prisma.roadmapTemplate.deleteMany(),
    prisma.questionOption.deleteMany(),
    prisma.question.deleteMany(),
    prisma.track.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const [adminHash, learnerHash] = await Promise.all([
    argon2.hash("Admin123!", { type: argon2.argon2id }),
    argon2.hash("Roadmap123!", { type: argon2.argon2id }),
  ]);

  const admin = await prisma.user.create({
    data: { name: "Roadmap Admin", email: "admin@rgroadmap.local", passwordHash: adminHash, role: "ADMIN" },
  });
  const learner = await prisma.user.create({
    data: { name: "Maya Hassan", email: "learner@rgroadmap.local", passwordHash: learnerHash, role: "LEARNER" },
  });

  const tracks = new Map<string, { id: string; title: string }>();
  for (const seed of trackSeeds) {
    const track = await prisma.track.create({ data: { ...seed, isPublished: true } });
    tracks.set(seed.slug, { id: track.id, title: track.title });
  }

  for (let questionIndex = 0; questionIndex < questionSeeds.length; questionIndex += 1) {
    await prisma.question.create({
      data: {
        prompt: questionSeeds[questionIndex],
        sortOrder: questionIndex + 1,
        isActive: true,
        options: {
          create: optionSets[questionIndex].map((label, optionIndex) => ({
            label,
            value: `option-${optionIndex}`,
            score: optionIndex,
            sortOrder: optionIndex + 1,
          })),
        },
      },
    });
  }

  const createdTemplates = new Map<string, { id: string; milestones: Array<{ id: string; sortOrder: number; title: string; description: string; estimatedHours: number | null; resources: unknown }> }>();
  for (const [slug, levels] of Object.entries(templates)) {
    const track = tracks.get(slug)!;
    for (const [level, milestones] of Object.entries(levels) as Array<[Level, MilestoneSeed[]]>) {
      const template = await prisma.roadmapTemplate.create({
        data: {
          trackId: track.id,
          level,
          title: `${track.title} — ${level.charAt(0) + level.slice(1).toLowerCase()} Roadmap`,
          description: `A practical ${level.toLowerCase()} learning path for ${track.title}.`,
          milestones: {
            create: milestones.map((milestone, index) => ({
              sortOrder: index + 1,
              title: milestone.title,
              description: milestone.description,
              estimatedHours: milestone.hours,
              resources: milestone.resources,
            })),
          },
        },
        include: { milestones: { orderBy: { sortOrder: "asc" } } },
      });
      createdTemplates.set(`${slug}:${level}`, template);
    }
  }

  const frontend = tracks.get("front-end-development")!;
  const assessment = await prisma.assessment.create({
    data: {
      userId: learner.id,
      sessionId: "seeded-demo-visitor",
      trackId: frontend.id,
      status: "COMPLETED",
      computedLevel: "BEGINNER",
      completedAt: new Date(),
    },
  });
  const demoTemplate = createdTemplates.get("front-end-development:BEGINNER")!;
  await prisma.savedRoadmap.create({
    data: {
      userId: learner.id,
      assessmentId: assessment.id,
      trackId: frontend.id,
      level: "BEGINNER",
      title: "My Front-End Development Roadmap",
      milestones: {
        create: demoTemplate.milestones.map((milestone, index) => ({
          templateMilestoneId: milestone.id,
          sortOrder: milestone.sortOrder,
          title: milestone.title,
          description: milestone.description,
          estimatedHours: milestone.estimatedHours,
          resources: milestone.resources as object,
          completedAt: index === 0 ? new Date() : null,
        })),
      },
    },
  });

  await prisma.analyticsEvent.createMany({
    data: [
      { userId: learner.id, sessionId: "seeded-demo-visitor", eventName: "QUIZ_STARTED", properties: { trackId: frontend.id } },
      { userId: learner.id, sessionId: "seeded-demo-visitor", eventName: "QUIZ_COMPLETED", properties: { trackId: frontend.id, computedLevel: "BEGINNER" } },
      { userId: learner.id, sessionId: "seeded-demo-visitor", eventName: "ROADMAP_GENERATED", properties: { trackId: frontend.id } },
      { userId: learner.id, sessionId: "seeded-demo-visitor", eventName: "ROADMAP_SAVED", properties: { trackId: frontend.id } },
    ],
  });

  console.log("RG Roadmap seed completed.");
  console.log("Learner: learner@rgroadmap.local / Roadmap123!");
  console.log("Admin: admin@rgroadmap.local / Admin123!");
  console.log(`Created ${tracks.size} tracks, ${questionSeeds.length} questions, and ${createdTemplates.size} templates.`);
  void admin;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
