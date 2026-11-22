import type { CareerTrack, InterviewSession } from '../types/interview';

export const CAREER_TRACKS: CareerTrack[] = [
  {
    id: 'python-dev',
    role: 'Python Developer',
    tagline: 'Async APIs, data structures, concurrency & clean architecture',
    coreTopics: ['FastAPI / Pydantic', 'Asyncio & GIL', 'OOP & Decorators', 'SQL Optimization'],
  },
  {
    id: 'web-dev',
    role: 'Web Developer',
    tagline: 'Modern web standards, HTTP lifecycle, security & full-stack flows',
    coreTopics: ['Browser Rendering', 'REST & Auth', 'Semantic HTML / CSS', 'Caching'],
  },
  {
    id: 'data-analyst',
    role: 'Data Analyst',
    tagline: 'SQL window functions, experimentation, KPI framing & storytelling',
    coreTopics: ['SQL Aggregations', 'A/B Testing', 'Data Cleaning', 'Executive Insights'],
  },
  {
    id: 'java-dev',
    role: 'Java Developer',
    tagline: 'JVM internals, Spring Boot, concurrency & enterprise design patterns',
    coreTopics: ['JVM Memory & GC', 'Spring Boot DI', 'Streams & Concurrency', 'Transactions'],
  },
  {
    id: 'ui-ux',
    role: 'UI/UX Designer',
    tagline: 'Design systems, usability testing, accessibility & product craft',
    coreTopics: ['Information Architecture', 'WCAG Accessibility', 'Prototyping', 'Design Tokens'],
  },
  {
    id: 'frontend-dev',
    role: 'Frontend Developer',
    tagline: 'React architecture, state isolation, Core Web Vitals & accessibility',
    coreTopics: ['React Reconciliation', 'Core Web Vitals', 'TypeScript', 'ARIA & Keyboard UX'],
  },
  {
    id: 'backend-dev',
    role: 'Backend Developer',
    tagline: 'Distributed systems, schema design, queues & fault tolerance',
    coreTopics: ['Indexing & Locking', 'Rate Limiting', 'Idempotency', 'Observability'],
  },
  {
    id: 'custom-role',
    role: 'Custom Job Role',
    tagline: 'Define any specialized role or domain title for bespoke questions',
    coreTopics: ['Tailored Rubric', 'Seniority Calibration', 'Custom Focus'],
    isCustom: true,
  },
];

export const SEED_SESSIONS: InterviewSession[] = [
  {
    id: 'seed-frontend-nov17',
    createdAt: '2026-11-17T14:30:00.000Z',
    displayDate: 'Nov 17, 2026',
    shortDate: 'Nov 17',
    isBenchmark: true,
    config: {
      role: 'Frontend Developer',
      experience: 'Fresher',
      difficulty: 'Medium',
      type: 'Mixed',
    },
    metrics: {
      totalScore: 41.5,
      averageScore: 8.3,
      technicalScore: 8.4,
      hrScore: 8.1,
      communicationScore: 8.4,
      confidenceScore: 8.0,
    },
    headlineSummary:
      'Strong improvement in clarity and technical depth across React rendering, state isolation, and accessibility fundamentals.',
    skillsToImprove: [
      'Core Web Vitals (INP, CLS, LCP) Diagnostics',
      'Concise Behavioral Pacing',
    ],
    recommendations: [
      'Review browser rendering pipeline and Interaction to Next Paint (INP) profiling.',
      'Keep technical explanations structured: concept, trade-off, then real example.',
    ],
    records: [
      {
        question: {
          id: 'fe-q1',
          index: 1,
          category: 'Technical',
          topic: 'React Reconciliation & Memoization',
          prompt:
            'How does React reconciliation determine when to re-render a subtree, and when can memoization actually hurt performance?',
          hint: 'Discuss virtual DOM diffing, referential equality, and comparison overhead.',
          keyExpectations: ['Element type & key diffing', 'Referential stability', 'When React.memo adds cost'],
        },
        answer:
          'React compares elements by type and key during reconciliation to decide whether to reuse fiber nodes or remount. React.memo skips re-renders when props remain shallowly equal, though wrapping trivial components or passing unstable inline callbacks adds comparison overhead without meaningful savings.',
        durationSeconds: 78,
        evaluation: {
          score: 8.8,
          technicalAccuracy: 9.0,
          clarity: 8.8,
          confidence: 8.5,
          strengths: [
            'Strong breakdown of React reconciliation and memoization trade-offs.',
            'Correctly identified fiber node reuse by type and key.',
          ],
          gaps: ['Could briefly mention Profiler flamegraphs for verifying optimization wins.'],
          improvements: ['Cite a concrete metric such as commit duration reduction from profiling.'],
          sampleAnswer:
            'React reconciles fiber trees by matching element type and stable keys. Memoization via React.memo or useMemo helps only when parent renders frequently and child subtrees are expensive; otherwise, shallow prop checks add unnecessary memory and comparison overhead.',
          coachingNote: 'Sharp technical framing—add one profiling example to make it senior-grade.',
        },
      },
      {
        question: {
          id: 'fe-q2',
          index: 2,
          category: 'Technical',
          topic: 'State Isolation & Derived State',
          prompt:
            'Why should derived values be computed during render instead of synchronized via useEffect and extra state?',
          hint: 'Consider extra render passes, stale intermediate frames, and single source of truth.',
          keyExpectations: ['Avoiding double render passes', 'Preventing state drift', 'useMemo for heavy derivations'],
        },
        answer:
          'Storing derived state in useEffect causes an extra render pass after commit and risks brief UI inconsistency. Computing derived values directly during render keeps one source of truth and avoids synchronization bugs.',
        durationSeconds: 64,
        evaluation: {
          score: 8.6,
          technicalAccuracy: 8.7,
          clarity: 8.6,
          confidence: 8.2,
          strengths: [
            'Clear explanation of avoiding double render passes and state drift.',
            'Concise and well-paced answer.',
          ],
          gaps: ['Mention useMemo when a derivation involves large array sorting or filtering.'],
          improvements: ['Pair the rule with a threshold example such as filtering 5,000+ rows.'],
          sampleAnswer:
            'Computing derived values directly during render eliminates cascading useEffect updates and stale intermediate states. Keep state minimal and reach for useMemo only when profiling shows the derivation itself is expensive.',
          coachingNote: 'Well-articulated principle with strong practical instincts.',
        },
      },
      {
        question: {
          id: 'fe-q3',
          index: 3,
          category: 'Technical',
          topic: 'Core Web Vitals (INP & LCP)',
          prompt:
            'A dashboard feels sluggish when users click filter buttons and the hero image loads late. How do you diagnose and fix INP and LCP?',
          hint: 'Break down long main-thread tasks for INP and resource discovery/priority for LCP.',
          keyExpectations: ['Long tasks & yielding', 'fetchpriority / preload for LCP', 'Layout/paint minimization'],
        },
        answer:
          'For LCP I would compress images and preload the hero asset. For INP I would reduce bundle size and avoid heavy synchronous state updates on click.',
        durationSeconds: 52,
        evaluation: {
          score: 7.2,
          technicalAccuracy: 7.5,
          clarity: 7.4,
          confidence: 7.2,
          strengths: [
            'Correctly linked LCP to image preloading and INP to main-thread click handlers.',
          ],
          gaps: [
            'Expand on Core Web Vitals optimization (INP & LCP) diagnostics using Performance panel.',
            'Missing startTransition / scheduler.yield() or input-delay vs processing-duration breakdown.',
          ],
          improvements: [
            'Break INP into input delay, processing duration, and presentation delay.',
            'Mention fetchpriority="high" and avoiding lazy-loading on the LCP element.',
          ],
          sampleAnswer:
            'To improve LCP, ensure the hero image is discoverable in initial HTML, avoid loading="lazy", and add fetchpriority="high". For INP, profile the Performance tab for long tasks >50ms, defer non-urgent filtering with startTransition, and yield to the main thread before heavy DOM commits.',
          coachingNote: 'Good high-level intuition, but interviewers look for measurable diagnostic steps.',
        },
      },
      {
        question: {
          id: 'fe-q4',
          index: 4,
          category: 'HR',
          topic: 'Handling Constructive Code Review Feedback',
          prompt:
            'Tell me about a time a peer or mentor pushed back strongly on your frontend implementation. How did you respond?',
          hint: 'Use Situation, Task, Action, Result with a focus on collaboration.',
          keyExpectations: ['Openness to critique', 'Objective comparison', 'Measurable outcome'],
        },
        answer:
          'During a college project, a teammate flagged that my custom modal lacked keyboard focus trapping and Escape handling. Instead of defending my quick prototype, we reviewed WCAG dialog patterns together, rebuilt it with proper focus restoration, and tested it using keyboard-only navigation.',
        durationSeconds: 71,
        evaluation: {
          score: 8.3,
          technicalAccuracy: 8.2,
          clarity: 8.5,
          confidence: 8.1,
          strengths: [
            'Demonstrated humility and engineering maturity.',
            'Included concrete accessibility improvements.',
          ],
          gaps: ['Quantify the final outcome or team adoption slightly more explicitly.'],
          improvements: ['Close STAR answers with how the reusable component benefited later screens.'],
          sampleAnswer:
            'When a reviewer noted accessibility gaps in my custom modal, I paused feature work to pair on focus management and Escape-key dismissal. We turned the fix into a shared accessible dialog primitive that passed keyboard audits across four subsequent features.',
          coachingNote: 'Authentic collaboration story with clear technical ownership.',
        },
      },
      {
        question: {
          id: 'fe-q5',
          index: 5,
          category: 'HR',
          topic: 'Learning Under Tight Deadlines',
          prompt:
            'Describe a situation where you had to learn an unfamiliar frontend tool or API quickly to ship a deliverable on time.',
          hint: 'Highlight how you prioritized core concepts over perfection.',
          keyExpectations: ['Structured learning strategy', 'Scope prioritization', 'Delivery outcome'],
        },
        answer:
          'Before a hackathon deadline, I needed to integrate an interactive chart library I had never used. I read the core data-binding docs first, built an isolated sandbox spike in 45 minutes, and shipped the main view with responsive tooltips an hour before submission.',
        durationSeconds: 66,
        evaluation: {
          score: 8.6,
          technicalAccuracy: 8.6,
          clarity: 8.7,
          confidence: 8.0,
          strengths: [
            'Focused, action-oriented STAR structure.',
            'Smart use of an isolated sandbox spike before full integration.',
          ],
          gaps: ['Briefly mention one edge case you consciously deferred or tested.'],
          improvements: ['Keep your closing result crisp in one sentence.'],
          sampleAnswer:
            'Faced with an unfamiliar charting API under a 24-hour deadline, I isolated a minimal data spike first to validate responsiveness and tooltips before wiring live state—delivering a clean, bug-free dashboard ahead of freeze.',
          coachingNote: 'Strong pacing and pragmatic engineering prioritization.',
        },
      },
    ],
  },
  {
    id: 'seed-python-nov14',
    createdAt: '2026-11-14T11:15:00.000Z',
    displayDate: 'Nov 14, 2026',
    shortDate: 'Nov 14',
    isBenchmark: true,
    config: {
      role: 'Python Developer',
      experience: 'Fresher',
      difficulty: 'Medium',
      type: 'Mixed',
    },
    metrics: {
      totalScore: 38.5,
      averageScore: 7.7,
      technicalScore: 7.8,
      hrScore: 7.6,
      communicationScore: 8.0,
      confidenceScore: 7.6,
    },
    headlineSummary:
      'Solid grasp of Python data structures and FastAPI basics; sharpen pagination design and structured STAR outcomes.',
    skillsToImprove: [
      'Keyset Pagination & API Error Envelopes',
      'Asyncio Event Loop Blocking Prevention',
    ],
    recommendations: [
      'Practice designing paginated REST endpoints with keyset cursors and Pydantic error envelopes.',
      'Structure behavioral answers using measurable STAR outcomes.',
    ],
    records: [
      {
        question: {
          id: 'py-q1',
          index: 1,
          category: 'Technical',
          topic: 'Python Memory & Mutability',
          prompt:
            'Why are mutable default arguments dangerous in Python functions, and how does Python bind default values at definition time?',
          hint: 'Explain function object __defaults__ evaluation once at def time.',
          keyExpectations: ['Evaluated once at def time', 'Shared state across calls', 'None sentinel pattern'],
        },
        answer:
          'Default arguments are evaluated once when the function is defined, not on each call. If you use an empty list as a default, every call without that argument mutates the same list. The fix is defaulting to None and initializing inside the function body.',
        durationSeconds: 58,
        evaluation: {
          score: 8.4,
          technicalAccuracy: 8.6,
          clarity: 8.5,
          confidence: 8.0,
          strengths: ['Crisp explanation of definition-time binding and the None sentinel pattern.'],
          gaps: ['Mention dataclass field(default_factory=list) as a bonus modern idiom.'],
          improvements: ['Connect to dataclasses or Pydantic Field(default_factory=...) when relevant.'],
          sampleAnswer:
            'Python evaluates default parameter expressions once when executing def and stores them on __defaults__. Using a mutable object like [] shares mutations across invocations; instead default to None or use default_factory in dataclasses.',
          coachingNote: 'Accurate and confident fundamentals.',
        },
      },
      {
        question: {
          id: 'py-q2',
          index: 2,
          category: 'Technical',
          topic: 'Asyncio & Concurrency',
          prompt:
            'In an async FastAPI endpoint, what happens if you call a synchronous blocking HTTP or database driver directly inside async def?',
          hint: 'Consider how a single-threaded event loop schedules coroutines.',
          keyExpectations: ['Event loop starvation', 'Async drivers vs threadpool', 'run_in_executor / sync def'],
        },
        answer:
          'Calling a blocking library inside async def freezes the entire event loop so other concurrent requests cannot progress until it returns. You should use an async driver like httpx or asyncpg, or offload blocking calls to a threadpool.',
        durationSeconds: 62,
        evaluation: {
          score: 8.1,
          technicalAccuracy: 8.2,
          clarity: 8.1,
          confidence: 7.8,
          strengths: ['Correctly identified event loop blocking and proper async driver alternatives.'],
          gaps: ['Explain FastAPI’s behavior when declaring a normal def route (automatic threadpool).'],
          improvements: ['Contrast I/O-bound concurrency with CPU-bound multiprocessing.'],
          sampleAnswer:
            'Blocking I/O inside an async def stalls the single-threaded event loop across all active connections. Use native async clients (httpx, asyncpg), wrap legacy blocking calls with asyncio.to_thread, or declare the FastAPI handler as plain def so FastAPI runs it in AnyIO’s worker threadpool.',
          coachingNote: 'Good understanding—adding FastAPI’s sync-vs-async routing nuance elevates the answer.',
        },
      },
      {
        question: {
          id: 'py-q3',
          index: 3,
          category: 'Technical',
          topic: 'Paginated REST API & Pydantic',
          prompt:
            'How would you design a paginated REST endpoint in Python/FastAPI for a million-row activity feed without offset slowdown?',
          hint: 'Compare OFFSET/LIMIT degradation vs cursor/keyset pagination and consistent error models.',
          keyExpectations: ['Keyset cursor pagination', 'Composite index (created_at, id)', 'Pydantic response & error schema'],
        },
        answer:
          'Offset pagination gets slow at deep pages because the database still scans skipped rows. Instead I would pass a cursor parameter and return items plus a next_cursor token in a Pydantic model.',
        durationSeconds: 55,
        evaluation: {
          score: 6.9,
          technicalAccuracy: 6.6,
          clarity: 7.4,
          confidence: 7.0,
          strengths: ['Identified why OFFSET degrades on large tables and proposed cursor tokens.'],
          gaps: [
            'Specify composite tie-breaker ordering (created_at, id) to avoid skipped rows on identical timestamps.',
            'Define explicit Pydantic validation and standardized HTTP error envelopes.',
          ],
          improvements: [
            'Include opaque base64 cursor encoding and limit+1 lookahead for has_more.',
            'Show a structured error schema (code, message, field_errors).',
          ],
          sampleAnswer:
            'Use keyset pagination ordered by (created_at DESC, id DESC) backed by a composite index, fetching limit + 1 rows to determine has_more and encoding the last tuple as an opaque cursor. Pair it with strict Pydantic query bounds (1 <= limit <= 100) and a uniform error envelope.',
          coachingNote: 'Solid intuition; practice writing out the exact SQL predicate and response schema.',
        },
      },
      {
        question: {
          id: 'py-q4',
          index: 4,
          category: 'HR',
          topic: 'Debugging a Difficult Production/Lab Issue',
          prompt:
            'Tell me about a stubborn bug you tracked down. How did you isolate the root cause systematically?',
          hint: 'Walk through hypothesis testing, logging, and prevention.',
          keyExpectations: ['Systematic isolation', 'Root cause verification', 'Regression test'],
        },
        answer:
          'A data ingestion script kept failing silently on certain CSV rows. I added structured logging with row numbers, isolated an encoding mismatch between UTF-8 and Windows-1252, normalized input decoding, and added a unit test with sample malformed files.',
        durationSeconds: 67,
        evaluation: {
          score: 7.7,
          technicalAccuracy: 7.8,
          clarity: 8.1,
          confidence: 7.6,
          strengths: ['Clear debugging sequence ending with a regression test.'],
          gaps: ['Mention how many records or hours of manual work the fix saved.'],
          improvements: ['Include a measurable impact metric at the end of your STAR response.'],
          sampleAnswer:
            'When silent CSV ingestion failures dropped 12% of partner uploads, I added row-level structured logging, reproduced the Windows-1252 encoding mismatch locally, enforced explicit chardet/fallback decoding, and added automated regression fixtures—eliminating silent drops.',
          coachingNote: 'Strong logical flow; quantify the business impact to finish decisively.',
        },
      },
      {
        question: {
          id: 'py-q5',
          index: 5,
          category: 'HR',
          topic: 'Prioritizing Competing Tasks',
          prompt:
            'How do you prioritize when you have two urgent tasks due on the same day—for instance, fixing a failing test suite and finishing a new endpoint?',
          hint: 'Show communication with stakeholders and risk-based triage.',
          keyExpectations: ['Risk assessment', 'Proactive communication', 'Unblocking teammates'],
        },
        answer:
          'I fix the failing test suite first if it blocks teammates from merging, while communicating clearly with my lead about the timeline for the new endpoint.',
        durationSeconds: 49,
        evaluation: {
          score: 7.4,
          technicalAccuracy: 7.8,
          clarity: 7.9,
          confidence: 7.6,
          strengths: ['Sensible prioritization around unblocking the team and transparent communication.'],
          gaps: ['Answer is quite short—add a concrete example of time-boxing or scope negotiation.'],
          improvements: ['Structure behavioral answers using measurable STAR outcomes.'],
          sampleAnswer:
            'I triage by blast radius: a broken CI suite blocks the entire team, so I isolate or fix the regression first while sharing a realistic ETA for the new endpoint and scoping out non-critical polish if needed.',
          coachingNote: 'Right instinct—expand slightly with a real example and clear outcome.',
        },
      },
    ],
  },
];
