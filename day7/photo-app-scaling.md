# SnapShare System Scaling Plan

A comprehensive scaling and capacity plan for SnapShare, a photo-sharing application where users upload photos and scroll a feed of photos from accounts they follow.

---

## 1. Assumptions and Daily Active Users (DAU)

Based on the initial design specifications and standard engineering estimation guidelines (rounding 1 day to 100,000 seconds for rough estimates):

* Total Registered Users: 10,000,000 (10 million).
* Daily Activity Rate: 10% of registered users access the application on any given day.
* Daily Active Users (DAU): 10,000,000 * 10% = 1,000,000 active users per day.
* User Behavior Assumptions:
  * Each active user uploads an average of 1 photo per day.
  * Each active user views an average of 50 feed pages per day.
* File Size Specifications:
  * Average original photo size: 2 MB (2,000 KB = 2,000,000 bytes).
  * Generated thumbnail size: 50 KB (50,000 bytes).
* Timing and Estimation Constants:
  * Seconds per day: approximately 86,400 (rounded to 100,000 seconds for back-of-the-envelope calculations).
  * Peak traffic multiplier: 5x the daily average traffic during busy hours.

---

## 2. Traffic and Storage Capacity Calculations

### A. Photo Uploads per Second (Writes)
* Daily Upload Volume: 1,000,000 users * 1 photo/day = 1,000,000 photo uploads per day.
* Average Uploads per Second: 1,000,000 uploads / 100,000 seconds = 10 uploads/second.
* Peak Uploads per Second (5x multiplier): 10 uploads/second * 5 = 50 uploads/second.

### B. Feed Views per Second (Reads)
* Daily Feed Views Volume: 1,000,000 users * 50 feed views/day = 50,000,000 feed views per day.
* Average Feed Views per Second: 50,000,000 views / 100,000 seconds = 500 feed views/second.
* Peak Feed Views per Second (5x multiplier): 500 views/second * 5 = 2,500 feed views/second.

Note: Using exact seconds (86,400): average uploads ≈ 11.6/s, peak uploads ≈ 58/s; average feed views ≈ 578.7/s, peak feed views ≈ 2,893.5/s. Both methods confirm the same order of magnitude.

### C. Photo and Thumbnail Storage per Year
For each uploaded photo, the system stores both the original full-resolution photo and an optimized thumbnail.

* Daily Original Photo Storage: 1,000,000 photos * 2 MB = 2,000,000 MB = 2,000 GB = 2 TB per day.
* Daily Thumbnail Storage: 1,000,000 thumbnails * 50 KB = 50,000,000 KB = 50,000 MB = 50 GB per day.
* Total Daily Storage Ingestion: 2,000 GB + 50 GB = 2,050 GB per day ≈ 2.05 TB per day.
* Annual Storage Ingestion (365 days):
  * Original photos: 2 TB/day * 365 days = 730 TB per year (730,000 GB).
  * Thumbnails: 50 GB/day * 365 days = 18,250 GB per year = 18.25 TB per year.
  * Total Storage per Year: 730 TB + 18.25 TB = 748.25 TB per year ≈ 750 TB per year.

---

## 3. Workload Analysis: Read-Heavy vs. Write-Heavy

SnapShare is overwhelmingly a read-heavy system:
* Read-to-Write Ratio: 50,000,000 feed reads / 1,000,000 photo writes = 50 : 1.
* There are 50 feed view requests for every 1 photo uploaded.

### Architectural Implications of a Read-Heavy System:
1. Aggressive In-Memory Caching: Since the database would choke under 2,500 peak queries/sec if every feed scroll hit disk, an in-memory caching tier (Redis) is essential to serve popular feed timelines and user metadata in 1 ms.
2. Database Read Replicas: Read traffic must be separated from write traffic. The primary database only handles writes (10 to 50 uploads/sec), while multiple read replicas scale out to service cache misses across follower feeds.
3. Edge Caching via CDN: Image bytes must never touch the application servers or databases on reads. Photo files and thumbnails must be cached across Content Delivery Network (CDN) edge points close to users worldwide.

---

## 4. Why Binary Photo Files Must NOT Be Stored Inside the Database

Storing large raw binary images (BLOBs) directly inside relational databases (like MySQL or PostgreSQL) is a critical anti-pattern that leads to severe operational bottlenecks:

1. Database Bloat and Memory Exhaustion: Relational storage engines (such as InnoDB) optimize page buffers (RAM cache) to keep index trees and table rows in memory. Storing 2 MB images directly in tables quickly evicts valuable indexes and hot rows from the buffer pool, tanking query performance across the entire application.
2. Backups and Maintenance Nightmares: Ingesting 750 TB of binary data per year makes database backups, snapshots, restorations, and point-in-time recovery painfully slow and practically impossible.
3. Database Connection Saturation: Streaming a 2 MB photo across a database connection holds the connection open for hundreds of milliseconds, exhausting the connection pool and blocking standard metadata queries.
4. Extreme Infrastructure Costs: High-performance provisioned SSD database storage costs roughly 5 to 10 times more than distributed object storage tiers.

### Where Photo Files Belong Instead: Cloud Object Storage
Photos must be saved in a Cloud Object Storage service (such as Amazon S3, Google Cloud Storage, or Cloudflare R2).
* How it works:
  * The actual raw image files are stored in object storage buckets, which are purpose-built for exabyte-scale, highly durable (99.999999999%), and cost-effective unstructured media storage.
  * The relational database only stores lightweight string metadata: photo ID, author ID, timestamps, captions, and the URL / S3 object key referencing the file (e.g., https://cdn.snapshare.com/photos/2026/10/photo_9482.jpg).

---

## 5. System Architecture Diagram

```text
                      +----------------------+
                      |         DNS          | (Resolves api.snapshare.com &
                      |    (e.g., Route53)   |  cdn.snapshare.com)
                      +----------+-----------+
                                 |
     +---------------------------+---------------------------+
     |                                                       |
     v                                                       v
+-------------------------+                             +-------------------------+
|     Client Browsers     |--- Static Assets & Photos ->|           CDN           |
|      & Mobile Apps      |<------- Cached Content -----|  (Cloudflare / CloudFront)
+------------+------------+                             +------------+------------+
             |                                                       | Cache Miss
             | API Requests (JSON & Uploads)                         v
             v                                          +-------------------------+
     +---------------+                                  |      Object Storage     |
     | Load Balancer |                                  |       (Amazon S3)       |
     |   (HAProxy)   |                                  |  [Originals & Thumbs]   |
     +-------+-------+                                  +------------^------------+
             |                                                       |
     +-------+----------------------+                                | Direct Put
     v       v                      v                                | & Get
+---------+---------+        +-------------+                         |
| App     | App     |  ...   | App         |                         |
| Server 1| Server 2|        | Server N    |                         |
+----+----+----+----+--------+------+------+                         |
     |         |                    |                                |
     | Writes  | Reads              | Background Jobs                |
     |         |                    v                                |
     |         |             +-------------+                         |
     |         |             |Message Queue|                         |
     |         |             | (RabbitMQ / |                         |
     |         |             | Amazon SQS) |                         |
     |         |             +------+------+                         |
     |         |                    |                                |
     |         |                    v                                |
     |         |             +-------------+                         |
     |         |             |  Thumbnail  |--- Fetches Original, ---+
     |         |             |   Worker    |    Resizes, and
     |         |             |   Cluster   |    Uploads 50 KB Thumb
     |         |             +-------------+
     v         v
+---------+ +----------+     +-------------+
| Primary | | Read     |     | In-Memory   |
| DB      | | Replicas |     | Cache       | (Redis Cluster)
| (MySQL) | | (MySQL)  |     | (User Feeds)|
+---------+ +----------+     +-------------+
  (Only       (Feed Reads,
  Writes)     Cache Misses)
```

---

## 6. Component Explanations (One Sentence per Component)

1. DNS (Domain Name System): Resolves the domain name snapshare.com into valid IP addresses so clients can route traffic to the nearest CDN edge or load balancer.
2. CDN (Content Delivery Network): Caches static assets, original photos, and generated thumbnails on globally distributed edge servers to deliver fast image downloads with minimal latency.
3. Load Balancer: Distributes incoming user API and upload requests evenly across multiple application servers while routing traffic away from unhealthy instances.
4. Application Servers (Stateless Cluster): Run the core business logic, handle authentication, process upload requests, and assemble feed timelines without storing session state in local memory.
5. In-Memory Cache (Redis): Stores precomputed user feed timelines, follower lists, and hot metadata in RAM to deliver read responses in 1 to 2 milliseconds and protect the database.
6. Primary Database (MySQL Primary): Serves as the single authoritative source of truth for all write operations, storing user records, post metadata, timestamps, and image storage URLs.
7. Read Replicas (MySQL Replicas): Replicate data asynchronously from the primary database to serve high-volume feed and profile read queries that miss the cache.
8. Object Storage (Amazon S3): Stores the raw binary payloads for all 2 MB original photos and 50 KB thumbnails with high durability, high availability, and low cost.
9. Message Queue (Amazon SQS / RabbitMQ): Buffers asynchronous image-processing jobs so upload requests finish immediately without making users wait for resizing.
10. Thumbnail Worker Cluster: Pulls pending image processing jobs from the message queue, downloads the original photo, creates a compressed 50 KB thumbnail, saves it to object storage, and updates the database record.

---

## 7. Step-by-Step Flow: Uploading a Photo

When a user on mobile or web uploads a new photo, the request flows through the scaled architecture as follows:

1. Client Upload Request: The user selects a 2 MB photo on their device and clicks "Post"; the client sends a POST /photos multipart request containing the binary photo and post caption to api.snapshare.com.
2. Load Balancing: The Load Balancer receives the HTTPS request, performs an SSL termination check, selects an available, healthy application server via round-robin or least-connections, and proxies the payload.
3. Validation and Object Storage Upload:
   * The application server validates the user session token and verifies the file format and file size.
   * Rather than holding the image in server memory or writing it to a database table, the app server directly streams the 2 MB binary photo into Cloud Object Storage (Amazon S3) under a unique key (e.g., s3://snapshare-media/photos/original/abc-123.jpg).
4. Primary Database Record Insertion: The app server executes an INSERT statement on the Primary Database, creating a new post record containing the author user ID, caption, timestamp, status (processing), and the S3 URL of the original image.
5. Enqueue Thumbnail Generation Job: The app server pushes a lightweight JSON task message into the Message Queue with the photo ID and original S3 key.
6. Immediate Response to User: The app server deletes the user cached feed key in Redis (cache invalidation) and immediately returns an HTTP 201 Created response to the client app in under 150 ms.
7. Asynchronous Background Processing (Worker):
   * An independent background Thumbnail Worker pulls the job message off the queue.
   * The worker streams the 2 MB original photo from S3, resizes it into a sharp 50 KB thumbnail, and uploads the thumbnail back to S3.
   * The worker updates the post row in the Primary Database with the thumbnail URL and marks status as ready.
   * The worker deletes the job message from the queue.

---

## 8. Architectural Trade-offs

Every system design involves balancing competing priorities. SnapShare deliberately makes the following trade-offs:

### Trade-off 1: Asynchronous Processing (Responsiveness vs. Immediate Thumbnail Availability)
* The Choice: We chose an asynchronous message queue and background worker architecture for thumbnail generation instead of having the application server resize the image synchronously before returning the HTTP response.
* What we gain: High upload throughput and ultra-low user latency. Users do not have to wait 1 to 3 seconds while CPU-intensive image downscaling occurs; the upload returns 201 Created in milliseconds.
* What it costs: Temporary inconsistency. For 1 to 2 seconds after an upload, the thumbnail does not exist yet, requiring a temporary placeholder blurhash until the worker finishes.

### Trade-off 2: Read Replicas and Cache-Aside (Speed vs. Data Freshness / Replication Lag)
* The Choice: We chose to serve feed reads from Redis in-memory caches and MySQL asynchronous read replicas rather than forcing every read to query the primary database.
* What we gain: Massive read scalability and system survivability. Caches and replicas absorb 2,500 peak reads per second in 1 to 5 ms, keeping primary database CPU near zero.
* What it costs: Replication lag and eventual consistency. When a user posts a photo, read replicas receive this update asynchronously a few milliseconds later. For social media feeds, a 1-second delay is completely acceptable.

### Single Point of Failure (SPOF) Prevention Summary
* If any individual App Server dies, the Load Balancer automatically redirects traffic to healthy servers.
* If the Primary Database fails, automated health-checks promote one of the synchronized Read Replicas to become the new primary.
* If the Redis cache fails, requests degrade gracefully by querying read replicas directly while Redis restarts.
* All static and binary media are replicated across multiple geographic availability zones inside Cloud Object Storage and CDN edge nodes.
