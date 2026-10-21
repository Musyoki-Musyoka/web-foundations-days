# TicketHub System Architecture & Scaling Design Document

A complete engineering specification for **TicketHub**, an online ticketing platform engineered to handle both standard day-to-day event operations and extreme, high-concurrency flash sales when popular stadium concerts go on sale.

---

## 1. Requirements

### Functional Requirements
1. **Browse & Search Events:** Users can search and view upcoming concert events, venues, dates, and pricing tiers.
2. **Interactive Seat Map:** Users can view available, reserved, and sold seats for a specific venue in real time.
3. **Seat Reservation (Hold):** A user can select a specific available seat and place a temporary hold on it (e.g., 10 minutes) while completing payment.
4. **Checkout & Payment:** Users can securely enter payment details to finalize ticket purchases.
5. **Ticket Retrieval:** Users can view purchased digital tickets, barcodes/QR codes, and booking receipts.

### Non-Functional Requirements
1. **Zero Double-Booking (Correctness & Consistency):** Under no circumstance may two users purchase or hold the same physical seat. Financial and inventory correctness strictly overrides availability during race conditions.
2. **High Availability:** 99.9% uptime during regular operations to maintain brand reputation and consistent revenue.
3. **Fairness & Queue Integrity:** In high-demand flash sales, requests must be processed fairly (First-Come, First-Served) to prevent scalpers, bots, and sudden server crashes from denying genuine fans.
4. **Low Latency:** 
   * Browsing event pages: < 50 ms (via edge caching).
   * Seat map rendering: < 100 ms.
   * Hold and checkout response: < 200 ms.

---

## 2. Traffic and Capacity Estimations

### Baseline Facts
* **Registered Users:** 2,000,000 users.
* **Normal Day Traffic:** 50,000 daily visitors, each viewing 10 pages; 5,000 tickets sold per day.
* **"Big Sale" Flash Surge:** 200,000 concurrent users attempting to buy 20,000 seats within the first 10 minutes (600 seconds).

---

### A. Normal Day Traffic
* **Page Views per Day:** 
  $$50,000\text{ visitors} \times 10\text{ views} = 500,000\text{ page views/day}$$
* **Average Read Throughput:**
  $$\frac{500,000\text{ views}}{100,000\text{ s}} = 5\text{ reads/second}$$
* **Peak Read Throughput ($5\times$):** $25\text{ reads/second}$.
* **Ticket Sales (Writes):**
  $$\frac{5,000\text{ sales}}{100,000\text{ s}} = 0.05\text{ writes/second (peak } \approx 0.25\text{ writes/second)}$$
* **Conclusion:** Normal operations are minimal and easily handled by a single entry-level server and small relational database.

---

### B. "Big Sale" Flash Surge Traffic (First 10 Minutes = 600 Seconds)
* **Active User Surge:** 200,000 concurrent fans hitting the site at the exact same minute.
* **Traffic Intensity (Assuming each user refreshes the seat map/event 5 times in 10 minutes):**
  $$200,000\text{ users} \times 5\text{ page refreshes} = 1,000,000\text{ reads in } 600\text{ seconds}$$
  $$\text{Flash Read QPS} = \frac{1,000,000}{600} \approx 1,667\text{ reads/second (peaks over } 3,000\text{ reads/s)}$$
* **Write Contention (200,000 people fighting for 20,000 seats):**
  $$\text{Flash Write/Hold Attempts} = \frac{200,000\text{ attempts}}{600\text{ seconds}} \approx 333\text{ hold requests/second}$$
  *(With initial peak spikes reaching 1,500+ hold attempts/second in the opening 30 seconds).*

---

### C. Normal vs. Big Sale Comparison

| Metric | Normal Day Traffic | Big Sale Flash Surge | Surge Multiplier |
| :--- | :--- | :--- | :--- |
| **Active Users** | 50,000 across 24 hours | 200,000 in 10 minutes | $4\times$ users in $1/144\text{th}$ time |
| **Read Requests/sec** | 5 reads/sec | 1,667 to 3,000 reads/sec | $\approx 600\times$ increase |
| **Write Requests/sec** | 0.05 writes/sec | 333 to 1,500 writes/sec | $\approx 6,000\times$ increase |
| **Primary Bottleneck** | None (underutilized) | Row-level DB lock contention on 20,000 seat rows | Extreme database lock starvation |

---

## 3. REST API Design

| Method | Path | Description | Success Status | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/v1/events` | Browses upcoming concert events with category and date filtering. | `200 OK` | No |
| `GET` | `/v1/events/{id}/seats` | Retrieves real-time seat availability map for an event. | `200 OK` | No |
| `POST` | `/v1/events/{id}/seats/hold` | Places a temporary 10-minute hold on a selected seat. | `200 OK` | Yes |
| `POST` | `/v1/orders/checkout` | Validates payment and permanently commits ticket purchase. | `201 Created` | Yes |
| `GET` | `/v1/users/me/tickets` | Lists all purchased tickets and QR entry codes for the logged-in user. | `200 OK` | Yes |

### Key Request & Response Examples:

#### 1. Hold a Seat (`POST /v1/events/{id}/seats/hold`)
* **Request Body:**
  ```json
  {
    "seat_id": 4120,
    "hold_duration_seconds": 600
  }
  ```
* **Response Body (`200 OK`):**
  ```json
  {
    "reservation_token": "res_hold_9f82a17b",
    "seat_id": 4120,
    "event_id": 104,
    "expires_at": "2026-10-21T10:10:00Z",
    "price_cents": 8500
  }
  ```

#### 2. Checkout & Confirm Purchase (`POST /v1/orders/checkout`)
* **Request Body:**
  ```json
  {
    "reservation_token": "res_hold_9f82a17b",
    "payment_method_token": "pm_tok_visa_4242"
  }
  ```
* **Response Body (`201 Created`):**
  ```json
  {
    "order_id": 98124,
    "ticket_id": 4120,
    "status": "confirmed",
    "qr_code_url": "https://cdn.tickethub.com/qr/tk_4120.png",
    "purchased_at": "2026-10-21T10:04:12Z"
  }
  ```

---

## 4. Relational Data Model (DDL)

```sql
-- 1. Users Table
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- 2. Events Table
CREATE TABLE events (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  venue VARCHAR(100) NOT NULL,
  event_time TIMESTAMP NOT NULL,
  total_seats INT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- 3. Seats Table
CREATE TABLE seats (
  id INT NOT NULL AUTO_INCREMENT,
  event_id INT NOT NULL,
  section VARCHAR(20) NOT NULL,
  row_num VARCHAR(10) NOT NULL,
  seat_number INT NOT NULL,
  price_cents INT NOT NULL,
  status ENUM('available', 'held', 'sold') NOT NULL DEFAULT 'available',
  version INT NOT NULL DEFAULT 0, -- Optimistic locking counter
  held_by_user_id INT NULL,
  hold_expires_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_seat (event_id, section, row_num, seat_number),
  CONSTRAINT fk_seats_events FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_seats_held_user FOREIGN KEY (held_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Orders Table
CREATE TABLE orders (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  seat_id INT NOT NULL,
  total_amount_cents INT NOT NULL,
  payment_status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  payment_reference VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_seat (seat_id), -- Absolute physical guarantee: 1 order per seat
  CONSTRAINT fk_orders_users FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_orders_events FOREIGN KEY (event_id) REFERENCES events(id),
  CONSTRAINT fk_orders_seats FOREIGN KEY (seat_id) REFERENCES seats(id)
) ENGINE=InnoDB;
```

---

## 5. Preventing Double-Booking: The Critical Consistency Engine

Preventing two people from purchasing the exact same seat during a flash sale requires a multi-layered concurrency defense utilizing database transactions, unique constraints, and atomic distributed locking:

### A. Temporary Hold Leases via Distributed Cache (Redis)
* When a fan selects a seat, the application acquires an atomic distributed lock via Redis using `SET seat:{id}:lock {user_id} NX EX 600` (Sets key only if it does **N**ot e**X**ist, with **EX**piry of 600 seconds).
* If another fan clicks the seat 1 millisecond later, Redis rejects the operation instantly without touching database disks.

### B. Pessimistic Row-Level Locking in ACID Transactions
When translating a hold into a database transaction:
```sql
START TRANSACTION;

-- 1. Exclusively lock only this specific seat row against concurrent transactions
SELECT id, status, hold_expires_at 
FROM seats 
WHERE id = 4120 AND event_id = 104 
FOR UPDATE;

-- 2. Validate that the seat is truly unreserved or that an earlier hold has expired
-- If valid, establish the hold:
UPDATE seats 
SET status = 'held', 
    held_by_user_id = 1042, 
    hold_expires_at = NOW() + INTERVAL 10 MINUTE 
WHERE id = 4120;

COMMIT;
```
* The `FOR UPDATE` clause instructs the InnoDB engine to place an exclusive write lock on row `4120`. Any competing transaction attempting to inspect or modify row `4120` is forced to wait until this transaction completes.

### C. Unique Constraint Physical Guarantee
* The `orders` table defines a strict `UNIQUE KEY uq_order_seat (seat_id)`.
* Even in a catastrophic application bug where two worker threads bypass application checks, the database storage engine itself physically halts the second `INSERT INTO orders`, rolling back the transaction with a duplicate key violation.

---

## 6. End-to-End System Architecture Diagram

```text
                               ┌──────────────────────┐
                               │         DNS          │ (Route 53: Anycast routing)
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │   CDN Edge Network   │ (Cloudflare: caches event pages,
                               │ (Static Cache & WAF) │  DDoS mitigation, bot shield)
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │ Virtual Waiting Room │ (Token Bucket Queue: buffers
                               │   (Queue-it / AWS)   │  200k users to 2,000 active fans)
                               └──────────┬───────────┘
                                          │ Admitted Users with Signed Access Tokens
                                          ▼
                               ┌──────────────────────┐
                               │    Load Balancer     │ (ALB / HAProxy: SSL termination)
                               └──────────┬───────────┘
                                          │
                  ┌───────────────────────┼───────────────────────┐
                  ▼                       ▼                       ▼
          ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
          │ App Server 1  │       │ App Server 2  │  ...  │ App Server N  │
          └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
                  │                       │                       │
                  ├───────────────────────┼───────────────────────┤
                  │                       │                       │
                  ▼                       ▼                       ▼
          ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
          │ Redis Cache   │       │ Primary DB    │       │ Read Replicas │
          │ (Seat Status  │       │ (MySQL 8.4)   │       │ (MySQL Replicas│
          │  & Hold TTLs) │       │ Writes & Locks│──────>│ Seat Browsing)│
          └───────────────┘       └───────┬───────┘       └───────────────┘
                                          │
                                          ▼
                                  ┌───────────────┐       ┌───────────────┐
                                  │ Message Queue │──────>│ Ticket Worker │
                                  │  (RabbitMQ)   │       │ (PDF & QR)    │
                                  └───────────────┘       └───────────────┘
```

### Component Justifications (How the System Survives the Big Sale):
1. **CDN Edge Network:** Absorbs 95% of incoming read traffic by serving cached event banners, descriptions, and venue maps directly from edge locations.
2. **Virtual Waiting Room (Queue-it / AWS SQS):** Acts as a pressure-relief surge barrier that meters incoming fans, admitting only 2,000 users per minute into active checkout so downstream database connection pools never saturate.
3. **Load Balancer:** Distributes validated, queue-admitted traffic smoothly across stateless application servers.
4. **Stateless App Servers:** Perform token verification, input validation, and payment orchestrations without local session storage.
5. **Redis In-Memory Seat Cache:** Holds volatile 10-minute seat reservations and transient locks in RAM, resolving 90% of seat availability queries in 1 ms without hitting database disks.
6. **Primary MySQL Database:** Processes exclusive `FOR UPDATE` seat hold transitions and final order commitments with strict ACID isolation.
7. **Read Replicas:** Handle non-transactional user queries (e.g., viewing past order history) to keep the primary database completely clear for ticket checkout locking.
8. **Asynchronous Message Queue & Worker:** Generates ticket PDFs, barcodes, and email confirmations in the background after purchase, returning immediate 201 Created responses to buyers.

---

## 7. Architectural Trade-offs

### Trade-off 1: Strict Consistency vs. High Availability (The CAP Theorem)
* **The Choice:** We chose strict ACID consistency and pessimistic row locking over eventual consistency.
* **What we gain:** **Zero double-bookings.** No two concert fans will ever be charged for the exact same seat.
* **What it costs:** **Increased latency and queueing during flash sales.** Contended seats force sequential locking, meaning users must wait seconds in a structured virtual queue rather than experiencing instant unrestricted access.

### Trade-off 2: Virtual Waiting Room vs. Open-Door Free-for-All
* **The Choice:** We chose to meter traffic through an admission queue rather than allowing all 200,000 users to hammer the application servers simultaneously.
* **What we gain:** **System survival and fairness.** The platform remains online, fast, and responsive for the fans actively buying tickets, completely preventing cascading server crashes.
* **What it costs:** **Perceived user friction.** Fans must wait in a numbered queue line on high-demand concert days rather than entering the checkout flow simultaneously.
