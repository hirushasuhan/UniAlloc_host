<div align="center">

# UniAlloc — University Dean's Office Human Resource Allocation System

**A structured, role-based web platform for managing lecturer workloads, cross-department assignments, and student project requests across university faculties.**

[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![PHP](https://img.shields.io/badge/Backend-Vanilla%20PHP%20(PDO)-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://www.php.net/)
[![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)

</div>

---

## Table of Contents

1.  [Project Overview](#1-project-overview)
2.  [The Core Problem](#2-the-core-problem)
3.  [Our Solution](#3-our-solution)
4.  [Key Features at a Glance](#4-key-features-at-a-glance)
5.  [User Roles & Permissions](#5-user-roles--permissions)
6.  [Technology Stack](#6-technology-stack)
7.  [System Architecture](#7-system-architecture)
8.  [Database Design (ER Model)](#8-database-design-er-model)
9.  [UI/UX Design Philosophy](#9-uiux-design-philosophy)
10. [Development Methodology](#10-development-methodology)
11. [Step-by-Step Development Plan](#11-step-by-step-development-plan)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Project Structure](#13-project-structure)
14. [Setup & Installation](#14-setup--installation)
15. [References](#15-references)

---

## 1. Project Overview

**UniAlloc** is a web-based Human Resource Allocation System purpose-built for a university Dean's Office. It replaces ad-hoc, spreadsheet-driven workload management with a transparent, hierarchical platform that lets academic administrators assign the right work to the right lecturer at the right time — and allows students to formally request supervisors for their projects and theses.

Implementation target: Next.js for the frontend, Vanilla PHP 8.2 with PDO for the REST API, and MySQL 8 for persistence. All server-side rules live in PHP; Next.js consumes the API only.

The platform serves five distinct user roles operating within a two-tier academic structure (Faculties containing Departments) and provides:

- **Real-time workload tracking** — see exactly how many hours each lecturer has allocated before making a new assignment.
- **Hierarchical assignment control** — Deans manage their Faculty; Department Heads manage their Department; Lecturers manage their own progress.
- **Cross-boundary request workflows** — structured request channels when work must cross department or faculty lines.
- **Student project routing** — a formal portal for students to request a lecturer/supervisor, routed directly to the Dean.
- **Overload detection and suggestions** — automatic notifications when a lecturer is overloaded, with a list of available alternatives.

> **Reference:** This project draws structural inspiration from the [SDGP Resource Allocation project](https://www.sdgp.lk/project/2ce4736d-57c4-402d-af8f-811fedecc158) and builds upon lessons learned from a previous Hotel Booking Management System (IIT-18, Uva Wellassa University).

---

## 2. The Core Problem

University Dean's Offices consistently struggle with three interconnected challenges in managing academic human resources:

| Problem | Root Cause | Impact |
|---|---|---|
| **Unbalanced Lecturer Workloads** | No centralized view of each lecturer's current assignment load | Burnout for overloaded lecturers; wasted capacity for idle ones |
| **Informal Cross-Department Assignment** | No formal channel when a Department Head or Dean needs a lecturer from another unit | Confusion, conflicting obligations, and disputes over accountability |
| **Unsystematic Student Project Requests** | Students informally approach lecturers or submit paper forms with no tracking | Lost requests, inconsistent supervisor assignment, no status visibility for students |

**In short:** Academic HR management currently relies on personal relationships and informal communication rather than a structured, data-driven system. There is no centralized view of lecturer capacity, no formal workflow for cross-boundary work, and no way for students to track the status of their project supervision requests.

---

## 3. Our Solution

UniAlloc introduces a **centralized, hierarchy-aware intelligence layer** for academic HR allocation:

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UniAlloc Platform                           │
├──────────────┬──────────────────┬──────────────┬────────────────────┤
│ System Admin │      Dean        │  Dept. Head  │  Lecturer/Student  │
│  Dashboard   │   Dashboard      │  Dashboard   │    Dashboard       │
├──────────────┼──────────────────┼──────────────┼────────────────────┤
│ • Global     │ • Faculty view   │ • Dept view  │ • My assignments   │
│   config     │ • Assign to      │ • Assign to  │ • Progress bars    │
│ • User mgmt  │   Dept Heads &   │   Lecturers  │ • Workload chart   │
│ • Role promo │   Lecturers      │ • Cross-dept │ • Appeal form      │
│ • Audit logs │ • Student reqs   │   requests   │ • Request portal   │
│ • Maint.mode │ • Cross-faculty  │ • Overload   │   (Students only)  │
│              │   requests       │   alerts     │                    │
└──────────────┴──────────────────┴──────────────┴────────────────────┘
                                  │
                           ┌──────┴──────┐
                           │  MySQL DB   │
                           │ (ER Model)  │
                           └─────────────┘
```

**How it works:**

1. **Deans and Department Heads create assignments** and allocate them to Lecturers or Department Heads within their authority scope.
2. **The system shows each lecturer's current capacity** — assigned hours vs. available hours — before any assignment is made.
3. **If a needed lecturer is outside the assigner's scope**, a formal cross-department or cross-faculty request is submitted and tracked.
4. **Lecturers update their progress** on each assignment via a percentage slider and timestamped notes, giving supervisors a live feed.
5. **When a lecturer is overloaded**, the system notifies their Department Head and surfaces a list of underloaded lecturers as alternatives.
6. **Students submit supervisor requests** through a dedicated portal; the Dean reviews and formally assigns a Lecturer or Department Head.

---

## 4. Key Features at a Glance

### Core Functional Features

- **Authentication & Authorization** — Secure JWT-based login with 5-level role-based access control (RBAC)
- **Hierarchical Dashboards** — Role-specific dashboards tailored to each user's authority scope and data needs
- **Assignment Management** — Full CRUD for assignments with priority, deadline, and estimated hours; status tracking
- **Workload Capacity View** — Visual charts showing each lecturer's allocated hours vs. available capacity
- **Cross-Boundary Request Workflows** — Formal request channels for cross-department and cross-faculty work assignments
- **Student Request Portal** — Structured form for students to request project/thesis supervisors; Dean-reviewed and tracked
- **Overload Detection Engine** — Automatic alerts when a lecturer's workload exceeds their threshold, with alternative suggestions
- **Progress Tracking** — Per-assignment progress bars (0–100%) with timestamped notes updated by the Lecturer
- **Workload Appeal System** — Lecturers can formally appeal to reduce workload; routed through Department Head then Dean
- **Role Promotion Workflows** — Formal promotion flows: Lecturer to Department Head (Dean-initiated); Department Head to Dean (System Admin approval)
- **Notification System** — In-app alerts for new assignments, deadline warnings, overload flags, and request status changes
- **Audit Logs** — Timestamped log of all critical system actions, visible to System Admin

### UI/UX Features

- **Dark/Light Mode Toggle** — Smooth theme transitions for extended working sessions
- **Responsive Design** — Optimized for desktop, tablet, and mobile devices
- **Interactive Data Visualizations** — Capacity heatmaps, workload donut charts, and assignment bar charts
- **Micro-Animations** — Subtle hover effects, loading skeletons, and transition animations
- **Modern Design System** — Glassmorphism cards, gradient accents, and curated color palettes

---

## 5. User Roles & Permissions

UniAlloc enforces a strict five-level role hierarchy. Each role sees only what falls within their authority — nothing more, nothing less.

### Role 1: System Admin

The System Admin has complete platform control and is the only role that can elevate a user to Dean.

| Feature | Description |
|---|---|
| **Admin Dashboard** | KPI overview: total faculties, departments, lecturers, active assignments |
| **User Management** | Create, edit, deactivate, or delete any user account across all faculties |
| **Role Promotion Approval** | The only actor who can approve and confirm Department Head → Dean promotions |
| **Dean Assignment** | Assign or change which user holds the Dean role for each faculty |
| **Database Control** | Interface to manage DB configuration, run backups, and view table statistics |
| **System Settings** | Configure global settings: institution name, email templates, capacity thresholds |
| **Audit Logs** | Full timestamped log of all critical actions (logins, role changes, deletions, promotions) |
| **Maintenance Mode** | Temporarily take the platform offline for scheduled maintenance |

### Role 2: Dean (Sub-Admin Type A — one per Faculty)

The Dean manages an entire Faculty, which contains multiple Departments.

| Feature | Description |
|---|---|
| **Dean Dashboard** | Faculty-wide overview: department capacity heatmap, assignment board, alert feed |
| **Assignment to Department Heads** | Directly assign work to any Department Head within their Faculty |
| **Assignment to Lecturers** | Directly assign work to any Lecturer within their Faculty |
| **Cross-Faculty Requests** | To use a lecturer from another Faculty, must submit a formal request to that Faculty's Dean |
| **Student Request Review** | Receives all student project/thesis supervisor requests for their Faculty; assigns a Lecturer or Department Head |
| **Add Users** | Add new Lecturers and Department Heads to the system (within their Faculty only) |
| **Lecturer Promotion** | Promote a Lecturer to Department Head within their Faculty (no System Admin approval needed) |
| **Workload Overview** | View all lecturers' assigned works, capacity percentages, and overload status across the Faculty |
| **Cross-Faculty Inbox** | Review and approve or reject incoming cross-faculty assignment requests from other Deans |

> **Constraint:** A Dean cannot directly assign a lecturer from another Faculty. They also cannot be assigned work by Department Heads — only by System Admin or via a cross-faculty Dean-to-Dean request.

### Role 3: Department Head (Sub-Admin Type B — one per Department)

The Department Head manages a single Department within a Faculty.

| Feature | Description |
|---|---|
| **Department Dashboard** | Department capacity bar charts; lecturer workload table with overload highlights |
| **Assignment to Lecturers** | Directly assign work to any Lecturer within their own Department |
| **Cross-Department Requests** | To use a lecturer from another Department, must submit a formal request to that Department's Head |
| **Upward Requests to Dean** | Can submit work requests to their Dean (cannot assign work upward) |
| **Add Lecturers** | Add new Lecturers to the system within their Department only |
| **Promotion Nomination** | Nominate a Lecturer for promotion to Department Head (requires Dean's final confirmation) |
| **Workload Monitoring** | View capacity and workload of all Lecturers in their Department |
| **Overload Notifications** | Receives alerts when a Lecturer in their Department is overloaded, with a list of available alternatives |
| **Cross-Department Inbox** | Review and respond to incoming cross-department assignment requests |

> **Constraint:** A Department Head cannot assign work to Lecturers in other Departments, cannot assign work directly to the Dean, and cannot directly promote a Lecturer without Dean confirmation.

### Role 4: Lecturer

Lecturers belong to exactly one Department and are the primary recipients of assignments.

| Feature | Description |
|---|---|
| **Lecturer Dashboard** | "My Assignments" list with per-assignment progress bars, deadlines, and status |
| **Progress Updates** | Update each assigned work with a progress percentage (0–100%) and timestamped progress notes |
| **Workload Capacity Chart** | Personal donut chart showing allocated hours vs. remaining capacity |
| **Work Requests** | Submit a work request upward to their Department Head or Dean (cannot assign work to peers) |
| **Workload Appeals** | File a formal appeal to reduce workload with written justification; routes to Department Head first, then Dean |
| **Notifications** | Receive alerts for new assignments, approaching deadlines, overload warnings, and appeal status changes |
| **Profile Management** | Update personal information: name, skills, contact details, notification preferences |

> **Constraint:** A Lecturer cannot assign work to any other user. All upward communication is via request or appeal, not direct assignment.

### Role 5: Student

Students are requesters only — they cannot be assigned work within the system.

| Feature | Description |
|---|---|
| **Student Request Portal** | Submit a formal request for a project/thesis/research supervisor |
| **Request Form** | Fields: Full Name, Enrollment Number, Contact (email/phone), Request Title, Request Description |
| **Request Routing** | Submitted requests are automatically routed to the Dean of the student's Faculty |
| **Request Status Tracker** | View the current status of each submitted request: Pending / Approved / Rejected / Assigned |

---

## 6. Technology Stack

### Core stack (required)

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | [Next.js 14+](https://nextjs.org/) (React) | Server-side rendering, dynamic routing, role-aware page structure |
| **Backend** | PHP 8.2+ (Vanilla + PDO) | Hand-coded REST API, manual SQL queries, custom JWT auth (no frameworks) |
| **Database** | MySQL 8.x | Relational schema with foreign keys, indexes, and referential constraints |

### Supporting tools (optional and changeable)

| Area | Options | Purpose |
|---|---|---|
| **Styling** | Tailwind CSS or CSS modules | UI styling and layout |
| **UI Components** | shadcn/ui (optional) | Prebuilt, accessible components |
| **State Management** | Zustand or Redux Toolkit (optional) | Client-side state for sessions, assignments, and UI |
| **Charts** | Recharts or Chart.js (optional) | Capacity heatmaps, workload donut charts, and assignment bar charts |
| **Authentication** | JWT (JSON Web Tokens) | Stateless auth with role claims |
| **Version Control** | Git + GitHub | Branching strategy, pull requests, code reviews |
| **API Testing** | Postman / Insomnia | Manual and automated API endpoint testing |
| **Deployment** | Vercel (frontend) + AWS/DigitalOcean (backend) | Production hosting |

---

## 7. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                            │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                 Next.js Frontend (Port 3000)                     ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ ││
│  │  │  Admin   │ │  Dean    │ │  Dept.   │ │Lecturer  │ │Student│ ││
│  │  │Dashboard │ │Dashboard │ │  Head    │ │Dashboard │ │Portal │ ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────┘ ││
│  └─────────────────────────┬────────────────────────────────────────┘│
│                            │ HTTPS / REST API                        │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────────┐
│                     API GATEWAY / BACKEND                             │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │              Vanilla PHP 8.2+ (Servlets :8000)                    ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ ││
│  │  │ Auth &   │ │Assignment│ │ Request  │ │ Workload │ │Appeal │ ││
│  │  │ RBAC     │ │  Module  │ │  Module  │ │  Module  │ │Module │ ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────┘ ││
│  └─────────────────────────┬────────────────────────────────────────┘│
│                            │ PDO                                      │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────────┐
│               MySQL DATABASE (Port 3306)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │  users   │ │faculties │ │  depts   │ │assignments│ │work_reqs  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │ appeals  │ │ student  │ │ progress │ │  notifs  │ │audit_logs │ │
│  │          │ │ requests │ │          │ │          │ │           │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. Database Design (ER Model)

The relational database follows **3NF (Third Normal Form)** to eliminate redundancy while maintaining query performance.

### Core Entity Summary

| Entity | Purpose | Key Fields |
|---|---|---|
| `users` | All system users | id, full_name, email, password_hash, role_id, department_id, enrollment_number (students), contact, is_active, capacity_hours |
| `roles` | Role definitions | id, role_name (system_admin / dean / department_head / lecturer / student) |
| `faculties` | Top-level academic units (a faculty contains multiple departments) | id, faculty_name, dean_id |
| `departments` | Sub-units within a faculty | id, dept_name, faculty_id, head_id |
| `assignments` | Work assigned to lecturers or department heads | id, title, description, assigned_to, assigned_by, department_id, priority, status, estimated_hours, actual_hours, deadline, created_at |
| `assignment_progress` | Per-assignment progress updates logged by the Lecturer | id, assignment_id, updated_by, progress_percent, note, updated_at |
| `work_requests` | Formal cross-boundary work requests (cross-dept / cross-faculty / upward) | id, requester_id, target_user_id, target_dept_id, target_faculty_id, request_type, title, description, status (pending/approved/rejected), resolved_by, created_at |
| `workload_appeals` | Lecturer appeals to reduce assigned workload | id, lecturer_id, assignment_id, reason, status (pending/reviewed/resolved), reviewed_by, created_at |
| `student_requests` | Student project/thesis supervisor requests | id, student_id, faculty_id, title, description, status (pending/assigned/rejected), assigned_to, reviewed_by, created_at |
| `notifications` | In-app alerts for all roles | id, user_id, message, type, is_read, created_at |
| `audit_logs` | System-wide action log (System Admin view) | id, user_id, action, entity, entity_id, timestamp |
| `settings` | Global configuration key-value pairs | id, setting_key, setting_value, updated_by |
| `role_promotions` | Full history of role promotions | id, user_id, old_role_id, new_role_id, promoted_by, approved_by, promoted_at |

### ER Diagram — Key Relationships

```
┌───────────┐         ┌──────────────────────────┐
│   roles   │──1:N────│          users            │
└───────────┘         │  (id, full_name, role_id, │
                      │   department_id, ...)      │
                      └──────────┬───────────────┬─┘
                                 │               │
                           1:N (assigned_to) 1:N (assigned_by)
                                 │               │
                      ┌──────────▼───────────────┘
                      │       assignments         │
                      │  (id, title, deadline,    │
                      │   estimated_hours, ...)   │
                      └──────────┬────────────────┘
                                 │ 1:N
                      ┌──────────▼────────────────┐
                      │   assignment_progress      │
                      │  (progress_percent, note,  │
                      │   updated_at, ...)         │
                      └────────────────────────────┘

┌───────────┐  1:N   ┌──────────────────────────┐
│ faculties │────────│       departments         │
│(faculty_  │        │  (id, dept_name,          │
│  name,    │        │   faculty_id, head_id)    │
│  dean_id) │        └────────────┬──────────────┘
└───────────┘                     │ 1:N (department_id on users)
                      ┌───────────▼──────────────┐
                      │    users (lecturers,      │
                      │    dept heads, students)  │
                      └──────────────────────────┘

┌──────────────────┐       ┌──────────────────────┐
│  work_requests   │       │   student_requests   │
│ (cross_dept /    │       │ (student_id,         │
│  cross_faculty / │       │  faculty_id,         │
│  upward)         │       │  assigned_to, ...)   │
└──────────────────┘       └──────────────────────┘

┌──────────────────┐       ┌──────────────────────┐
│ workload_appeals │       │   role_promotions    │
│ (lecturer_id,    │       │ (user_id, old_role,  │
│  assignment_id,  │       │  new_role,           │
│  reason, status) │       │  promoted_by, ...)   │
└──────────────────┘       └──────────────────────┘
```

**Key Relationships:**

- A **Faculty** has one **Dean** (stored as `dean_id` in `faculties`) and many **Departments** (1:N).
- A **Department** has one **Department Head** (stored as `head_id` in `departments`) and many **Lecturers** (1:N via `users.department_id`).
- A **Role** has many **Users** (1:N) — each user belongs to exactly one role.
- An **Assignment** has one `assigned_to` user and one `assigned_by` user — both foreign keys to `users`.
- An **Assignment** has many **Progress** entries (1:N) — each logged by the assigned Lecturer.
- A **Work Request** links a `requester_id` to a target user, department, or faculty depending on `request_type`.
- A **Student Request** links a `student_id` to a `faculty_id`, and once resolved, to an `assigned_to` Lecturer/Department Head.
- **Notifications** and **Audit Logs** each belong to a single **User** (N:1).

---

## 9. UI/UX Design Philosophy

The UI must feel **premium, modern, and functional** — appropriate for a professional academic administration context. These principles guide every design decision:

| Principle | Implementation |
|---|---|
| **Dark-First Design** | Default dark theme with smooth toggle to light mode |
| **Glassmorphism** | Frosted-glass card backgrounds with subtle blur and transparency |
| **Gradient Accents** | Curated HSL-based gradients (e.g., indigo to violet) for buttons, headers, and highlights |
| **Modern Typography** | Google Fonts — Inter for body text, Outfit for headings |
| **Micro-Animations** | Hover scale effects, skeleton loading states, smooth page transitions using Framer Motion |
| **Data Visualization** | Interactive charts with tooltips: capacity heatmaps, workload donut charts, progress bars |
| **Responsive Layouts** | CSS Grid + Flexbox; collapsible sidebar on mobile with hamburger menu |
| **Accessibility** | Semantic HTML, ARIA labels, keyboard navigation, and WCAG 2.1 AA contrast ratios |

### Key Screens

1. **Login Page** — Centered card with role-aware redirect after login; university branding
2. **System Admin Dashboard** — KPI cards (total faculties, departments, lecturers, active assignments); user management table; role promotion approval queue; audit log panel; system settings
3. **Dean Dashboard** — Faculty overview with department capacity heatmap; assignment board; incoming student requests queue; cross-faculty requests inbox; overload alert feed
4. **Department Head Dashboard** — Department capacity bar charts; lecturer workload table with overload highlights; assignment creation panel; cross-department request inbox
5. **Lecturer Dashboard** — "My Assignments" list with per-assignment progress bars; progress update form (slider + note textarea); workload capacity donut chart; appeal submission form
6. **Student Request Portal** — Simple form (Name, Enrollment Number, Contact, Request Title, Description) plus a "My Requests" status tracker

---

## 10. Development Methodology

This project follows the **Waterfall Software Development Methodology** — a linear, sequential approach where each phase must be fully completed before the next begins.

**Why Waterfall?**
- **Well-defined requirements** — The project scope, roles, and features are fully specified upfront.
- **Structured deliverables** — Each phase produces concrete deliverables that serve as inputs for the next.
- **Clear milestones** — Progress is measurable through phase completion gates.
- **Documentation-driven** — Comprehensive documentation is produced at every stage.

### Waterfall Phases Mapping

```
  Requirements → Design → Implementation → Verification → Deployment
       |            |           |              |             |
    Phase 1      Phase 1    Phase 2-4       Phase 5       Phase 6
   (Planning)   (Design)   (Build)        (Testing)     (Deploy)
```

| Waterfall Stage | Project Phase | Key Deliverables |
|---|---|---|
| **Requirements** | Phase 1 (Week 1–2) | Requirements specification, role-permission matrix |
| **System Design** | Phase 1 (Week 1–2) | ER diagrams, UML diagrams (Use Case, Class, Sequence, Activity), UI wireframes, API specification |
| **Implementation** | Phase 2–4 (Week 3–9) | Database schema, hand-coded PHP backend API, Next.js frontend UI |
| **Verification** | Phase 5 (Week 10) | Integration testing, role-based testing, UAT |
| **Deployment & Maintenance** | Phase 6 (Week 11–12) | Production deployment, documentation, demo |

> **Note:** Unlike Agile/Scrum, the Waterfall approach does not revisit completed phases. All requirements and designs are finalized before coding begins.

---

## 11. Step-by-Step Development Plan

### Phase 1: Planning & System Design (Week 1–2)

| Step | Task | Deliverable |
|---|---|---|
| 1.1 | Finalize all functional and non-functional requirements for the five roles | Requirements Specification Document |
| 1.2 | Define the role-permission matrix covering all five roles and cross-boundary rules | Role-Permission Matrix |
| 1.3 | Design the ER diagram with all entities (faculties, departments, users, assignments, etc.) | ER Diagram (draw.io / dbdiagram.io) |
| 1.4 | Create Use Case diagrams for System Admin, Dean, Department Head, Lecturer, and Student | UML Use Case Diagrams |
| 1.5 | Create Class diagrams showing OOP class hierarchy and relationships | UML Class Diagrams |
| 1.6 | Create Sequence diagrams for key flows (login, assignment creation, cross-dept request, student request, appeal) | UML Sequence Diagrams |
| 1.7 | Create Activity diagrams for workflow processes (assignment lifecycle, request approval flow, promotion flow) | UML Activity Diagrams |
| 1.8 | Design high-fidelity UI wireframes and mockups for all six key screens | Figma Prototypes |
| 1.9 | Plan the REST API endpoints and request/response contracts | API Specification (OpenAPI) |

### Phase 2: Environment & Database Setup (Week 3)

| Step | Task | Deliverable |
|---|---|---|
| 2.1 | Install and configure MySQL 8.x; create the `uniAlloc_db` database | Running MySQL instance |
| 2.2 | Write and execute DDL scripts for all tables (users, roles, faculties, departments, assignments, etc.) | Populated schema matching ER diagram |
| 2.3 | Seed default data: roles (5 roles), test faculty/department structure, and all test user accounts | Seed scripts with all test accounts |
| 2.4 | Initialize the Vanilla PHP backend project structure (public router, controllers, services, DAO layers) | Scaffolded backend project |
| 2.5 | Configure PDO database connection and environment variables | Working DB connection |

### Phase 3: Backend API Development (Week 4–6)

| Step | Task | Deliverable |
|---|---|---|
| 3.1 | Implement User Login with JWT authentication and role-aware token claims | Auth endpoint (`/api/auth/login`) |
| 3.2 | Build RBAC middleware — validate role and scope on every protected route | Role-checking middleware/filter |
| 3.3 | Develop User CRUD APIs (System Admin: full; Dean/Dept Head: scoped to their faculty/dept) | `/api/users` endpoints |
| 3.4 | Develop Faculty and Department management APIs | `/api/faculties`, `/api/departments` endpoints |
| 3.5 | Develop Assignment CRUD APIs (Dean/Dept Head: create/assign; Lecturer: update progress) | `/api/assignments` endpoints |
| 3.6 | Build Assignment Progress API — log progress percentage and notes per assignment | `/api/assignments/{id}/progress` endpoints |
| 3.7 | Build Workload Capacity API — calculate allocated vs. available hours per lecturer | `/api/capacity/{userId}` endpoint |
| 3.8 | Implement Work Request API — cross-dept, cross-faculty, and upward request workflows | `/api/work-requests` endpoints |
| 3.9 | Implement Workload Appeal API — Lecturer submits appeal; Department Head/Dean reviews | `/api/appeals` endpoints |
| 3.10 | Implement Student Request API — student submits; Dean reviews and assigns | `/api/student-requests` endpoints |
| 3.11 | Implement Overload Detection Logic — trigger notification when lecturer exceeds capacity threshold | Server-side workload check on assignment creation |
| 3.12 | Build Notification API — create, list, and mark-as-read | `/api/notifications` endpoints |
| 3.13 | Implement Role Promotion API — Lecturer to Dept Head (Dean initiates); Dept Head to Dean (Admin approves) | `/api/promotions` endpoints |
| 3.14 | Build Audit Log API — record all critical actions (System Admin view) | `/api/audit-logs` endpoint |
| 3.15 | Write unit tests for all service layers and integration tests for endpoints | Test suite (PHPUnit) |

### Phase 4: Frontend Development (Week 7–9)

| Step | Task | Deliverable |
|---|---|---|
| 4.1 | Initialize Next.js project with Tailwind CSS and design system tokens | Configured frontend project |
| 4.2 | Build the Auth pages (Login) with form validation and role-aware redirect | Auth flow screen |
| 4.3 | Create the base layout: sidebar navigation (role-specific links), top bar, theme toggle | App shell / layout component |
| 4.4 | Build the **System Admin Dashboard** — KPI cards, user management table, promotion approval queue, audit log, settings panel | Admin pages |
| 4.5 | Build the **Dean Dashboard** — faculty overview, department capacity heatmap, assignment board, student requests queue, cross-faculty inbox, overload feed | Dean pages |
| 4.6 | Build the **Department Head Dashboard** — department capacity charts, lecturer workload table, assignment creation panel, cross-department inbox | Department Head pages |
| 4.7 | Build the **Lecturer Dashboard** — My Assignments list with progress bars, progress update form (slider + textarea), workload donut chart, appeal form | Lecturer pages |
| 4.8 | Build the **Student Request Portal** — supervisor request form + My Requests status tracker | Student pages |
| 4.9 | Integrate Recharts/Chart.js for all dashboard charts (capacity heatmaps, donut charts, bar charts) | Dynamic data visualizations |
| 4.10 | Add micro-animations with Framer Motion (page transitions, hover effects, loading skeletons) | Polished interactions |
| 4.11 | Implement responsive design — test on mobile, tablet, and desktop breakpoints | Fully responsive UI |

### Phase 5: Integration & End-to-End Testing (Week 10)

| Step | Task | Deliverable |
|---|---|---|
| 5.1 | Connect all frontend pages to backend REST APIs using Axios/Fetch | Fully integrated application |
| 5.2 | Implement global error handling and toast notifications for API responses | Error/success feedback system |
| 5.3 | Perform role-based testing — verify each of the five roles can only access permitted features and data | Test report per role |
| 5.4 | Test all cross-boundary workflows: cross-dept requests, cross-faculty requests, upward requests, appeals | Workflow test report |
| 5.5 | Test overload detection: assign hours beyond threshold and verify alert and alternative-lecturer suggestion | Overload test report |
| 5.6 | Test student request flow end-to-end: submit → Dean receives → Dean assigns → Student sees status | Student flow test report |
| 5.7 | Conduct User Acceptance Testing (UAT) against the original problem statement | UAT sign-off |
| 5.8 | Fix bugs, optimize slow queries, and improve loading performance | Stable release candidate |

### Phase 6: Deployment & Documentation (Week 11–12)

| Step | Task | Deliverable |
|---|---|---|
| 6.1 | Build the production frontend bundle and optimize assets | Optimized Next.js build |
| 6.2 | Deploy frontend to Vercel; backend to AWS/DigitalOcean; DB to managed MySQL | Live production URLs |
| 6.3 | Configure HTTPS, CORS, environment variables, and security headers | Secured deployment |
| 6.4 | Write final README.md, setup.md, and API documentation | Complete documentation |
| 6.5 | Record a demo video / presentation walkthrough | Project demo |

---

## 12. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | All passwords hashed with bcrypt; JWT tokens with expiry and role claims; HTTPS enforced; SQL injection prevention via parameterized queries |
| **Usability** | Clean, intuitive interface reflecting the academic hierarchy; maximum 3 clicks to reach any core feature |
| **Performance** | Dashboard loads in under 2 seconds; paginated API responses for large datasets (many lecturers/assignments) |
| **Compatibility** | Works on Chrome, Firefox, Safari, and Edge; responsive from 320px to 4K screens |
| **Maintainability** | Modular code structure; comprehensive inline documentation; Git version control with branching strategy |
| **Scalability** | Stateless backend (JWT); database indexing on frequently queried columns (user role, department_id, assignment status); connection pooling |
| **Data Integrity** | Foreign key constraints enforce referential integrity across all related entities (e.g., `department_id` on users must exist in `departments`) |

---

## 13. Project Structure

```
university-hr-allocation/
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/          # Login page (role-aware redirect on success)
│   │   │   ├── admin/           # System Admin dashboard pages
│   │   │   ├── dean/            # Dean dashboard pages
│   │   │   ├── department-head/ # Department Head dashboard pages
│   │   │   ├── lecturer/        # Lecturer dashboard pages
│   │   │   └── student/         # Student request portal pages
│   │   ├── components/
│   │   │   ├── ui/     # Design system primitives (Button, Card, Input, Badge)
│   │   │   ├── charts/          # CapacityHeatmap, WorkloadDonut, AssignmentBar
│   │   │   ├── layout/          # Sidebar, Topbar, ThemeToggle, Footer
│   │   │   ├── assignment/      # AssignmentCard, AssignmentModal, ProgressBar, ProgressForm
│   │   │   └── request/         # RequestForm, RequestStatus, AppealForm, StudentRequestForm
│   │   ├── lib/                 # Utilities, API client, auth helpers, capacity calculator
│   │   ├── hooks/#Custom React hooks (useCapacity, useAssignments, useRequests)
│   │   └── styles/              # Global CSS and Tailwind config
│   ├── public/                  # Static assets (university logo, icons)
│   ├── package.json
│   └── next.config.js
│
├── backend/                     # Vanilla PHP 8.2+ application (no frameworks)
│   ├── public/
│   │   └── index.php            # Entry point & custom router
│   ├── src/
│   │   ├── controllers/         # Request handler classes per module
│   │   ├── models/              # OOP model classes
│   │   ├── services/            # Business logic (capacity, overload detection)
│   │   ├── middleware/          # Custom auth & RBAC middleware
│   │   ├── dao/                 # Data Access Objects (PDO queries)
│   │   └── helpers/             # Utility functions
│   ├── config/
│   │   ├── database.php         # PDO connection config
│   │   └── app.php              # App settings & constants
│   ├── sql/
│   │   ├── schema.sql           # DDL scripts
│   │   └── seed.sql     # Seed data (roles, faculties, departments, test users)
│   └── .htaccess                # URL rewriting (Apache)
│
├── database/
│   ├── er-diagram.png           # ER Diagram image
│   ├── schema.sql               # Full DDL script
│   └── seed.sql                 # Initial seed data
│
├── docs/
│   ├── api-specification.yaml   # OpenAPI / Swagger spec
│   ├── use-case-diagram.png     # UML Use Case Diagram
│   └── wireframes/              # UI mockups (Figma exports)
│
├── README.md                    # <- You are here
└── setup.md                     # Local setup instructions
```

---

## 14. Setup & Installation

### Quick local dev workflow

Prereqs: MySQL 8 is running and the schema is loaded.

```
# Terminal 1: Backend API
cd backend
php -S localhost:8000 -t public

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

Next.js runs at `http://localhost:3000` and the PHP API at `http://localhost:8000`.

For detailed, step-by-step instructions on how to set up and run this project locally, please refer to:

### [setup.md](setup.md)

---

## 15. References

- [Next.js Documentation](https://nextjs.org/docs)
- [PHP PDO Documentation](https://www.php.net/manual/en/book.pdo.php)
- [PHP 8.2 Official Documentation](https://www.php.net/manual/en/)
- [MySQL Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)
- [SDGP Similar Project Reference](https://www.sdgp.lk/project/2ce4736d-57c4-402d-af8f-811fedecc158)
- Sommerville, I. (2011). *Software Engineering* (9th ed.). Addison-Wesley.
- Hotel Booking Management System — IIT-18 Final Report (Uva Wellassa University, 2025)

---

<div align="center">

**Built as a university project — designed to solve real academic HR management challenges.**

</div>
