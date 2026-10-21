<div align="center">

# UniAlloc — University Dean's Office Human Resource Allocation System

**A role-based, hierarchy-aware web platform for academic staff workload balancing, cross-boundary work allocation, and student research supervision tracking.**

[![Release](https://img.shields.io/badge/Release-v1.0.0-emerald?style=for-the-badge&logo=github)](https://github.com/hirushasuhan/UniAlloc_host/releases/tag/v1.0.0)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Next.js 14](https://img.shields.io/badge/Frontend-Next.js%2014%20(React)-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![PHP 8.2](https://img.shields.io/badge/Backend-Vanilla%20PHP%208.2%20(PDO)-777bb4?style=for-the-badge&logo=php&logoColor=white)](https://www.php.net/)
[![MySQL 8.0](https://img.shields.io/badge/Database-MySQL%208.0%20(3NF)-4479a1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![UML Standard](https://img.shields.io/badge/Architecture-UML%202.5%20Standard-6366f1?style=for-the-badge)](docs/SYSTEM_DOCUMENTATION.md)

<p align="center">
  <a href="https://www.unialloc.app" target="_blank"><strong>🌐 Live App: www.unialloc.app</strong></a> •
  <a href="https://uniallocsystem.vercel.app" target="_blank"><strong>⚡ Vercel Mirror: uniallocsystem.vercel.app</strong></a> •
  <a href="#-demo-credentials"><strong>🔑 Demo Logins</strong></a>
</p>

<p align="center">
  <a href="#-live-production-deployments">Live Deployments</a> •
  <a href="#-demo-credentials">Demo Logins</a> •
  <a href="#-quick-navigation">Quick Navigation</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-interactive-uml--er-diagrams">Interactive Diagrams</a> •
  <a href="#-user-roles--permissions">User Roles</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-quickstart--local-setup">Quickstart</a>
</p>

</div>

---

## 🌐 Live Production Deployments

The UniAlloc platform is officially released and live in production:

| Deployment | URL | Status | Environment & Security Architecture |
|---|---|---|---|
| 🌍 **Primary Domain** | [https://www.unialloc.app](https://www.unialloc.app) | 🟢 **Active / Live** | **Cloudflare Proxied** (Full Strict SSL, DDoS Shield, WAF, Global Edge CDN) &rarr; Vercel Serverless |
| ⚡ **Vercel System Mirror** | [https://uniallocsystem.vercel.app](https://uniallocsystem.vercel.app) | 🟢 **Active / Live** | Direct Vercel Edge Production Deployment Mirror |
| 🔌 **Backend REST API** | `https://backend-php.wasmer.app/api` | 🟢 **Active / Live** | High-performance PHP 8.2 PDO REST API Engine (Wasmer Edge) |

> [!NOTE]
> **Edge Security & Routing:** The production domain `www.unialloc.app` (and apex `unialloc.app`) is securely routed through **Cloudflare** as an enterprise perimeter defense layer. Cloudflare provides automated L3/L4/L7 DDoS mitigation, Web Application Firewall (WAF) rate protection, DNSSEC integrity, and end-to-end Full (Strict) TLS 1.3 encryption before traffic reaches the Vercel application host.

---

## 🔑 Demo Credentials

You can test and evaluate all system modules immediately using these pre-configured demo credentials:

| Role | Email | Password | Access Scope & Permissions |
|---|---|---|---|
| 👑 **System Admin** | `admin@university.edu` | `Admin@123` | Institutional Administrator (Full system privileges, user administration, promotion approvals, audit logs) |
| 🎓 **Dean (Computing)** | `dean.computing@university.edu` | `Dean@123` | Faculty of Computing (Faculty heatmap, cross-faculty requests, lecturer assignments, student appointments) |
| 🏛️ **Department Head (CS)** | `head.cs@university.edu` | `Head@123` | Department of Computer Science (Department capacity, cross-dept requests, Step 1 student endorsement) |
| 👨‍🏫 **Lecturer** | `lecturer1@university.edu` | `Lecturer@123` | Computer Science Academic Staff (Personal capacity donut, 0-100% assignment progress updates, appeal filing) |
| 🎓 **Student** | `student@university.edu` | `Student@123` | Undergraduate Student (Research & thesis supervisor request submission, real-time status tracker) |

> [!TIP]
> **Instant Role Routing:** When you sign in with any of the accounts above, the system automatically redirects to that role's specialized workspace and dashboard.

---

## 📌 Quick Navigation

- 📊 **Interactive Diagram Viewers (Open in any browser):**
  - [UML 2.5 Use Case Diagram](docs/usecase_diagram.html) — 5 actors, 25 use cases, `<<include>>`, `<<extend>>`
  - [UML 2.5 Class Diagram](docs/class_diagram.html) — Full 14-class domain model, composition, aggregation, multiplicities
  - [Crow's Foot ER Diagram](docs/er_diagram.html) — 14 relational tables in 3NF, exact data types & keys
- 📖 **Comprehensive System Specifications:** [docs/SYSTEM_DOCUMENTATION.md](docs/SYSTEM_DOCUMENTATION.md)
- 🛠️ **Step-by-Step Setup & Installation Guide:** [docs/setup.md](docs/setup.md)
- 🔒 **Demo Credentials & Rotation:** [database/DEMO_CREDENTIALS.local.md](database/DEMO_CREDENTIALS.local.md)

---

## 💡 The Core Problem & Our Solution

| Academic HR Challenge | Traditional Method | The UniAlloc Solution |
|---|---|---|
| **Unbalanced Lecturer Workloads** | Ad-hoc spreadsheets & memory | Real-time capacity calculation (`assigned_hours / capacity_hours`) with automated overload alerts at 90% threshold and alternative candidate suggestions. |
| **Informal Cross-Boundary Resourcing** | Verbal agreements & email threads | Multi-step request workflows (`pending_home_head` -> `pending_final`) across department and faculty boundaries with formal audit logging. |
| **Unsystematic Student Supervision Requests** | Paper forms or informal requests | Two-tier student supervisor portal with real-time status tracking, department head endorsement, and Dean supervisor appointment. |

---

## 🌟 Interactive UML & ER Diagrams

UniAlloc provides standalone, hardware-accelerated interactive SVG viewers for all standard software engineering diagrams:

| Diagram | Standard | Interactive Viewer | Specification Section |
|---|---|---|---|
| **Use Case Diagram** | UML 2.5 | [docs/usecase_diagram.html](docs/usecase_diagram.html) | [docs/SYSTEM_DOCUMENTATION.md §3](docs/SYSTEM_DOCUMENTATION.md#3-standard-uml-25-use-case-modeling) |
| **Class Diagram** | UML 2.5 | [docs/class_diagram.html](docs/class_diagram.html) | [docs/SYSTEM_DOCUMENTATION.md §4](docs/SYSTEM_DOCUMENTATION.md#4-standard-uml-25-class-diagram-specification) |
| **Entity-Relationship Diagram** | Crow's Foot (3NF) | [docs/er_diagram.html](docs/er_diagram.html) | [docs/SYSTEM_DOCUMENTATION.md §5](docs/SYSTEM_DOCUMENTATION.md#5-relational-database-design-crows-foot-er-model) |

*(To view, double-click any `.html` diagram file in your file explorer or open via browser).*

---

## 👥 User Roles & Permissions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             UniAlloc Hierarchy                              │
├─────────────────┬──────────────────┬─────────────────┬──────────────────────┤
│  System Admin   │      Dean        │ Department Head │  Lecturer / Student  │
├─────────────────┼──────────────────┼─────────────────┼──────────────────────┤
│ • Full platform │ • Faculty view   │ • Dept view     │ • My Assignments     │
│ • User CRUD     │ • Allocate to DH │ • Allocate to   │ • Progress (0-100%)  │
│ • Role promote  │   and Lecturers  │   Lecturers     │ • Workload Donut     │
│ • Audit logs    │ • Cross-faculty  │ • Cross-dept    │ • File Appeal        │
│ • System config │ • Student assign │ • Overload feed │ • Student Supervisor │
│ • Password reset│ • Appeals review │ • Step 1 endorse│   Portal (Students)  │
└─────────────────┴──────────────────┴─────────────────┴──────────────────────┘
```

1. **System Admin:** Global configuration, user administration across all faculties, elevating Department Heads to Dean, monitoring system audit logs and login attempts.
2. **Dean (Faculty Administrator):** Full faculty capacity heatmap, direct assignment to Department Heads & Lecturers, cross-faculty requests, final review and supervisor assignment for student requests, workload appeal resolution.
3. **Department Head (Department Administrator):** Department capacity monitoring, direct assignment to department lecturers, Step 1 endorsement of student requests, cross-department requests, first-level workload appeal review.
4. **Lecturer:** Personal assignment board with progress slider (0–100%) and chronological notes, personal capacity donut chart, filing workload appeals, submitting upward requests.
5. **Student:** Submit project/thesis supervisor requests with research topic and description; real-time tracking of endorsement and appointment status.

---

## 🏗️ System Architecture

UniAlloc implements a clean, decoupled 3-tier client-server architecture:

```
┌──────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION TIER (Next.js 14)                 │
│  Port 3000 — React, Tailwind CSS, Recharts, Framer Motion            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Admin   │ │  Dean    │ │Dept Head │ │ Lecturer │ │  Student  │  │
│  │Dashboard │ │Dashboard │ │Dashboard │ │Dashboard │ │  Portal   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ REST API (JSON / Bearer JWT)
┌──────────────────────────────────▼───────────────────────────────────┐
│                    APPLICATION & SERVICE TIER (PHP 8.2)              │
│  Port 8000 — Vanilla PHP, Custom Fast Router, Zero Frameworks        │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────────┐  │
│  │AuthController│ │AssignmentCtrl│ │WorkloadServ.│ │StudentReqCtrl│  │
│  └──────────────┘ └──────────────┘ └─────────────┘ └──────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Data Access Layer (UserDao, AssignmentDao, PDO Prepared Stmts)│  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ PDO Connection (Port 3306)
┌──────────────────────────────────▼───────────────────────────────────┐
│                     DATABASE PERSISTENCE TIER (MySQL 8.0)            │
│  14 Tables (3NF), Referential Integrity Constraints, AES-256-GCM     │
│  [users] [roles] [faculties] [departments] [assignments] [appeals]  │
│  [assignment_progress] [work_requests] [student_requests] [notifs]   │
│  [audit_logs] [settings] [role_promotions] [login_attempts]          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart & Local Setup

### 1. Database Setup
```bash
# Start MySQL Server, then:
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS uniAlloc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Load Schema, Migrations, and Seed Accounts:
mysql -u root -p uniAlloc_db < database/schema.sql
mysql -u root -p uniAlloc_db < database/apply_pending_migrations.sql
mysql -u root -p uniAlloc_db < database/seed.sql
```

### 2. Backend Setup (PHP 8.2+)
```bash
cd backend-php
cp .env.example .env

# Generate keys and paste into .env:
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;" # JWT_SECRET
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;" # APP_KEY

# Start backend on port 8000:
php -S localhost:8000 -t public/
```
Verify: [http://localhost:8000/api/health](http://localhost:8000/api/health) returns `{"status":"UP","database":"connected"}`.

### 3. Frontend Setup (Next.js 14)
```bash
cd frontend
npm install

# Start frontend on port 3000:
npm run dev
```
Open: [http://localhost:3000](http://localhost:3000)

*(For comprehensive troubleshooting, refer to [docs/setup.md](docs/setup.md)).*

---

## 🔑 Demo Credentials

Default accounts seeded by `database/seed.sql` for testing:

| Email | Role | Default Password | Faculty / Department |
|---|---|---|---|
| `admin@university.edu` | `system_admin` | `Admin@123` | Institutional Admin |
| `dean.computing@university.edu` | `dean` | `Dean@123` | Faculty of Computing |
| `dean.engineering@university.edu` | `dean` | `Dean@123` | Faculty of Engineering |
| `head.cs@university.edu` | `department_head` | `Head@123` | Computer Science |
| `head.se@university.edu` | `department_head` | `Head@123` | Software Engineering |
| `lecturer1@university.edu` | `lecturer` | `Lecturer@123` | Computer Science |
| `lecturer2@university.edu` | `lecturer` | `Lecturer@123` | Software Engineering |
| `student@university.edu` | `student` | `Student@123` | Undergraduate Student |

*(To rotate passwords to cryptographically random strings, run `mysql -u root -p uniAlloc_db < database/rotate_demo_credentials.sql`).*

---

## 🛡️ Security Highlights

- **Cloudflare Edge Shield:** The custom domain `unialloc.app` / `www.unialloc.app` is fronted by Cloudflare's global Anycast edge network, providing automated L3/L4/L7 DDoS mitigation, Web Application Firewall (WAF) rule sets, Bot management, DNSSEC verification, and Full (Strict) SSL/TLS 1.3 encryption.
- **Stateless JWT Tokens:** Embedded role and scope claims, cryptographically signed with HS256 and validated on every private route.
- **Instant Session Revocation:** Bumping `token_version` on password reset or role change immediately invalidates existing JWT sessions.
- **RFC 6238 TOTP Two-Factor Authentication:** Authenticator seeds encrypted at rest via AES-256-GCM using `APP_KEY`.
- **Brute-Force Protection:** IP-based and account-based sliding-window rate limiting on `/auth/login` backed by the `login_attempts` ledger.
- **SQL Injection Prevention:** 100% PDO prepared statements with strict parameter binding across all Data Access Objects (DAOs).
- **OWASP HTTP Security Headers:** Enforces Content-Security-Policy (CSP), HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`.

---

## 📁 Repository Directory Structure

```
UniAlloc_host/
├── frontend/                    # Next.js 14 React Application
│   ├── src/
│   │   ├── app/                 # Role-based App Router pages
│   │   ├── components/          # Reusable UI primitives, modals & charts
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # API client, JWT decoding & utilities
│   │   └── styles/              # Global Tailwind CSS
│   ├── public/                  # Static assets & university branding
│   └── package.json
│
├── backend-php/                 # Vanilla PHP 8.2+ REST API
│   ├── public/
│   │   └── index.php            # Front entry router
│   ├── src/
│   │   ├── controllers/         # API endpoint controllers
│   │   ├── dao/                 # PDO Data Access Objects
│   │   ├── helpers/             # Security, JWT & policy utilities
│   │   ├── middleware/          # JWT & RBAC middleware
│   │   └── services/            # Workload calculation & overload engines
│   ├── config/                  # App & Database configuration
│   └── .env.example             # Secret keys template
│
├── database/
│   ├── schema.sql               # Base DDL schema (14 tables)
│   ├── apply_pending_migrations.sql # Idempotent migration script (01 to 10)
│   ├── seed.sql                 # Initial seed accounts
│   └── rotate_demo_credentials.sql # Demo password rotation script
│
├── docs/
│   ├── usecase_diagram.html     # UML 2.5 Use Case Diagram (Interactive SVG)
│   ├── class_diagram.html       # UML 2.5 Class Diagram (Interactive SVG)
│   ├── er_diagram.html          # Crow's Foot ER Diagram (Interactive SVG)
│   ├── SYSTEM_DOCUMENTATION.md  # Detailed System Engineering Specs
│   ├── setup.md                 # Setup & Installation Guide
│   └── README.md                # Documentation Guide
│
└── README.md                    # This root project document
```

---

<div align="center">

**UniAlloc — Engineered for academic precision and institutional efficiency.**  
*IIT-18 Project • Uva Wellassa University*

</div>
