# Course Reflection: Web Foundations & Systems Design

### 1. Most Difficult Concept and How I Overcame It
The most challenging concept in this course was mastering the **cache-aside pattern and cache invalidation** under read-heavy scaling. Understanding the trade-off between sub-millisecond in-memory read speeds and the risk of serving stale data required a mental shift from single-server development to distributed systems thinking. I overcame this challenge by tracing individual HTTP requests step-by-step through the architecture—following how a write to a primary database must immediately trigger an active cache eviction (`DEL notes:user:id`) in Redis so the subsequent read is forced to fetch fresh data. Concrete back-of-the-envelope capacity estimations grounded these abstract concepts into real numbers.

### 2. Capstone Improvements Based on Feedback
Based on review and grading feedback, I would improve the **real-time resilience and observability** of my Project 2 capstone client and architecture. While the front-end client robustly handles asynchronous states, input validation, and XSS sanitization, I would enhance it by implementing optimistic UI updates paired with automated retries and exponential back-off for transient network errors. On the architectural side, I would expand the observability blueprint by adding distributed tracing (e.g., OpenTelemetry) and concrete metrics alerts for p95 latency thresholds and cache miss rates.

### 3. What I Will Learn Next
Moving forward, I will focus on building real production backends with **Node.js, Express, and PostgreSQL**. Specifically, I plan to translate my REST API designs and relational DDL schemas into live, working microservices with JWT authentication, middleware rate-limiting, and connection pooling. Following that, I look forward to exploring React to build component-driven front-ends that interact with these cloud backends.
