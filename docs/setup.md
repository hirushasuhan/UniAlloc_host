<div align="center">

# UniAlloc — Setup & Installation Guide

**Complete step-by-step instructions to get the University Dean's Office HR Allocation System running on your local machine.**

</div>

---

## Table of Contents

1.  [Prerequisites](#1-prerequisites)
2.  [Clone the Repository](#2-clone-the-repository)
3.  [Database Setup (MySQL)](#3-database-setup-mysql)
4.  [Backend Setup](#4-backend-setup)
    - [Option A: Java (Servlets + JDBC)](#option-a-java-servlets--jdbc)
    - [Option B: PHP (Vanilla + PDO)](#option-b-php-vanilla--pdo)
5.  [Frontend Setup (Next.js)](#5-frontend-setup-nextjs)
6.  [Running the Full Application](#6-running-the-full-application)
7.  [Default Test Accounts](#7-default-test-accounts)
8.  [Environment Variables Reference](#8-environment-variables-reference)
9.  [Common Issues & Troubleshooting](#9-common-issues--troubleshooting)
10. [Development Tools & Recommendations](#10-development-tools--recommendations)

---

## 1. Prerequisites

Ensure the following software is installed **before** proceeding. Click each link for the official download page.

| Software | Minimum Version | Purpose | Download |
|---|---|---|---|
| **Node.js** | v18.17+ (LTS) | Next.js frontend runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | v9+ (ships with Node) | JavaScript package manager | Included with Node.js |
| **Git** | v2.40+ | Version control & cloning | [git-scm.com](https://git-scm.com/) |
| **MySQL Server** | v8.0+ | Relational database | [dev.mysql.com](https://dev.mysql.com/downloads/mysql/) |
| **MySQL Workbench** *(optional)* | v8.0+ | Visual DB management & ER diagrams | [dev.mysql.com](https://dev.mysql.com/downloads/workbench/) |

**Choose ONE backend stack:**

| Backend Option | Software | Version | Download |
|---|---|---|---|
| **Option A** | Java Development Kit (JDK) | 17+ (LTS) | [adoptium.net](https://adoptium.net/) |
| | Apache Maven | 3.9+ | [maven.apache.org](https://maven.apache.org/) |
| | Apache Tomcat | 10.1+ | [tomcat.apache.org](https://tomcat.apache.org/) |
| **Option B** | PHP | 8.2+ | [php.net](https://www.php.net/downloads) |
| | XAMPP *(includes Apache + PHP + MySQL)* | 8.x | [apachefriends.org](https://www.apachefriends.org/) |

### Verify installations

Open a terminal and run these commands to confirm everything is installed:

```bash
# General
node -v          # Should output v18.x or higher
npm -v           # Should output 9.x or higher
git --version    # Should output 2.x or higher
mysql --version  # Should output 8.x

# If using Java (Option A)
java -version    # Should output 17.x or higher
mvn -v           # Should output 3.9.x or higher

# If using PHP (Option B)
php -v           # Should output 8.2.x or higher
```

---

## 2. Clone the Repository

```bash
# Clone the project repository
git clone https://github.com/your-username/university-hr-allocation.git

# Navigate into the project root
cd university-hr-allocation
```

> **Note:** Replace `your-username/university-hr-allocation` with your actual GitHub repository URL.

After cloning, you should see this structure:

```
university-hr-allocation/
├── frontend/          # Next.js application
├── backend-php/       # Vanilla PHP backend (Option B)
├── database/          # SQL scripts, ER diagrams
├── docs/              # API specs, wireframes
├── README.md
└── setup.md           # <- You are here
```

---

## 3. Database Setup (MySQL)

### 3.1 Start the MySQL Server

- **Windows (standalone):** Open Services -> Start "MySQL80"
- **Windows (XAMPP):** Open XAMPP Control Panel -> Start "MySQL"
- **macOS:** `brew services start mysql`
- **Linux:** `sudo systemctl start mysql`

### 3.2 Create the Database and User

Open MySQL Workbench, phpMyAdmin, or a terminal and execute:

```sql
-- Step 1: Create the database
CREATE DATABASE IF NOT EXISTS uniAlloc_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Step 2 (Optional): Create a dedicated application user (if not using root)
CREATE USER IF NOT EXISTS 'unialloc_user'@'localhost'
  IDENTIFIED BY 'Str0ng!P@ssw0rd';

-- Step 3 (Optional): Grant privileges to the dedicated user
GRANT ALL PRIVILEGES ON uniAlloc_db.* TO 'unialloc_user'@'localhost';
FLUSH PRIVILEGES;

-- Step 4: Verify
SHOW DATABASES LIKE 'university_hr%';
```

### 3.3 Import the Base Schema

Create all tables by running the DDL script:

```bash
# If your root user has a password: mysql -u root -p uniAlloc_db < database/schema.sql
mysql -u root uniAlloc_db < database/schema.sql
```

This creates all tables: `users`, `roles`, `faculties`, `departments`, `assignments`, `assignment_progress`, `work_requests`, `workload_appeals`, `student_requests`, `notifications`, `audit_logs`, `settings`, and `role_promotions`.

### 3.4 Import Seed Data

Populate the database with default roles, the test faculty/department structure, and all test user accounts:

```bash
# If your root user has a password: mysql -u root -p uniAlloc_db < database/seed.sql
mysql -u root uniAlloc_db < database/seed.sql
```

The seed script creates:
- All 5 roles (system_admin, dean, department_head, lecturer, student)
- Two sample faculties: Faculty of Computing, Faculty of Engineering
- Four sample departments: Computer Science, Software Engineering (under Computing); Civil Engineering, Electrical Engineering (under Engineering)
- All test user accounts listed in Section 7

> **Tip:** Since the backend is hand-coded (no ORM/framework), you must run these SQL scripts manually to set up your database schema and seed data before starting the backend server.

---

## 4. Backend Setup

Choose **one** of the two options below based on your team's chosen backend technology.

---

### Option A: Java (Servlets + JDBC)

> **Important:** Per project guidelines, the backend must be **hard-coded without frameworks**. We use plain Java Servlets for HTTP handling and raw JDBC for database access — no Spring Boot, no Hibernate, no JPA.

#### A.1 Navigate to the backend directory

```bash
cd backend-java
```

#### A.2 Configure the database connection

Open `resources/db.properties` and set your MySQL credentials:

```properties
# --- Database ---
db.url=jdbc:mysql://localhost:3306/uniAlloc_db?useSSL=false&serverTimezone=UTC
db.username=root
db.password=
db.driver=com.mysql.cj.jdbc.Driver

# --- JWT ---
jwt.secret=your-256-bit-secret-key-change-this-in-production
jwt.expiration=86400000

# --- CORS ---
cors.allowed.origins=http://localhost:3000

# --- Capacity Threshold ---
# Percentage of capacity_hours at which overload alert is triggered
overload.threshold.percent=90
```

#### A.3 Build the project with Maven

```bash
# Compile and package as a WAR file
mvn clean package -DskipTests
```

This produces a `target/unialloc.war` file.

#### A.4 Deploy to Apache Tomcat

1. Copy the WAR file to Tomcat's `webapps/` directory:
   ```bash
   cp target/unialloc.war /path/to/tomcat/webapps/
   ```
2. Start Tomcat:
   ```bash
   # Windows
   %CATALINA_HOME%\bin\startup.bat

   # macOS / Linux
   $CATALINA_HOME/bin/startup.sh
   ```

> **Alternative (development mode):** You can use the Maven Tomcat plugin for quick local testing:
> ```bash
> mvn tomcat7:run
> ```

#### A.5 Verify the backend is running

Open [http://localhost:8080/unialloc/api/health](http://localhost:8080/unialloc/api/health) — you should see:
```json
{ "status": "UP", "database": "connected" }
```

#### A.6 Key Backend Files (Java)

| File / Class | Purpose |
|---|---|
| `web.xml` | Maps URL patterns to Servlet classes and registers filters |
| `DatabaseManager.java` | Manages JDBC connection pool (manual `DriverManager` or HikariCP) |
| `AuthServlet.java` | Handles `/api/auth/login` with role-claim JWT generation |
| `JwtFilter.java` | Servlet filter that validates JWT and injects role on every protected request |
| `UserDAO.java` | Raw JDBC queries for user CRUD (prepared statements) |
| `AssignmentDAO.java` | Raw JDBC queries for assignment CRUD, progress updates |
| `WorkRequestDAO.java` | Raw JDBC queries for cross-dept/cross-faculty/upward requests |
| `WorkloadService.java` | Capacity calculation and overload detection logic |
| `NotificationDAO.java` | Raw JDBC queries for creating and listing in-app notifications |
| `StudentRequestDAO.java` | Raw JDBC queries for student supervisor requests |
| `AuditLogDAO.java` | Raw JDBC queries for writing and reading audit log entries |

#### A.7 Key API Endpoints (Java)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/login` | Login and receive JWT with role claim | No |
| GET | `/api/users` | List users (scoped to caller's faculty/dept by role) | Yes |
| POST | `/api/users` | Create a new user account | Yes (Admin, Dean, Dept Head) |
| GET | `/api/faculties` | List all faculties | Yes (Admin, Dean) |
| GET | `/api/departments` | List departments (scoped by faculty) | Yes |
| POST | `/api/assignments` | Create and assign work to a lecturer/dept head | Yes (Dean, Dept Head) |
| GET | `/api/assignments` | List assignments (scoped to caller's role/dept) | Yes |
| PATCH | `/api/assignments/{id}/progress` | Update assignment progress percentage and note | Yes (Lecturer) |
| GET | `/api/capacity/{userId}` | Get a user's workload capacity summary | Yes (Dean, Dept Head) |
| POST | `/api/work-requests` | Submit a cross-dept, cross-faculty, or upward request | Yes |
| GET | `/api/work-requests` | List incoming requests for the caller | Yes |
| PATCH | `/api/work-requests/{id}` | Approve or reject a work request | Yes (Dean, Dept Head) |
| POST | `/api/appeals` | Submit a workload appeal | Yes (Lecturer) |
| GET | `/api/appeals` | List appeals (Dept Head sees dept appeals; Dean sees faculty appeals) | Yes |
| PATCH | `/api/appeals/{id}` | Review/resolve an appeal | Yes (Dept Head, Dean) |
| POST | `/api/student-requests` | Submit a student project/thesis supervisor request | Yes (Student) |
| GET | `/api/student-requests` | List student requests (Dean sees faculty requests; Student sees own) | Yes |
| PATCH | `/api/student-requests/{id}` | Assign or reject a student request | Yes (Dean) |
| GET | `/api/notifications` | List notifications for the caller | Yes |
| PATCH | `/api/notifications/{id}/read` | Mark a notification as read | Yes |
| POST | `/api/promotions` | Initiate or approve a role promotion | Yes (Dean, Admin) |
| GET | `/api/audit-logs` | List all audit log entries | Yes (Admin) |

---

### Option B: PHP (Vanilla + PDO)

> **Important:** Per project guidelines, the backend must be **hard-coded without frameworks**. We use vanilla PHP for HTTP handling and raw PDO for database access — no Laravel, no Symfony, no Eloquent ORM.

#### B.1 Navigate to the backend directory

```bash
cd backend-php
```

#### B.2 Configure secrets and the database connection

All backend secrets live in `backend-php/.env`, which is **gitignored** —
`config/app.php` and `config/database.php` only read from it and contain no
credentials of their own. Start from the template:

```bash
cp .env.example .env
```

Generate the two required keys (run each and paste the output into `.env`):

```bash
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"   # JWT_SECRET
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"   # APP_KEY
```

Then fill in the rest:

```ini
APP_DEBUG=false                # true only on your own machine
JWT_SECRET=<64 hex characters> # required; the app refuses to start without it
JWT_TTL=480                    # access token lifetime in minutes (8 hours)
APP_KEY=<64 hex characters>    # required; encrypts TOTP secrets at rest
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=uniAlloc_db
DB_USER=root
DB_PASSWORD=
CORS_ORIGINS=http://localhost:3000
REGISTRATION_EMAIL_DOMAIN=     # e.g. university.edu to restrict student sign-ups
```

> **Never commit `.env`.** Each machine and each deployment gets its own
> `JWT_SECRET` and `APP_KEY`. Changing `APP_KEY` invalidates every enrolled
> authenticator app; changing `JWT_SECRET` signs everyone out.

#### B.3 Import the database schema and seed data

```bash
# Create all tables (if root has a password, add the -p flag)
mysql -u root uniAlloc_db < sql/schema.sql

# Seed default roles, faculty structure, and test accounts
mysql -u root uniAlloc_db < sql/seed.sql
```

#### B.4 Start the development server

```bash
# Using PHP's built-in development server
php -S localhost:8000 -t public/
```

> **Alternative:** If using XAMPP, place the `backend-php` folder inside `htdocs/` and access via `http://localhost/backend-php/public/`.

Verify the backend is running by opening [http://localhost:8000/api/health](http://localhost:8000/api/health) — you should see:
```json
{ "status": "UP", "database": "connected" }
```

#### B.5 Key Backend Files (PHP)

| File | Purpose |
|---|---|
| `public/index.php` | Entry point — custom router that maps URLs to controller methods |
| `.env` | **All secrets** (JWT key, app key, DB credentials). Gitignored — never commit |
| `.env.example` | Committed template showing which variables are required |
| `config/database.php` | Reads DB settings from `.env` (no credentials of its own) |
| `config/app.php` | Reads app settings from `.env` (no secrets of its own) |
| `src/controllers/AuthController.php` | Handles login with manual JWT generation and role claims |
| `src/middleware/JwtMiddleware.php` | Validates JWT token and role on every protected request |
| `src/dao/UserDAO.php` | Raw PDO queries for user CRUD (prepared statements) |
| `src/dao/AssignmentDAO.php` | Raw PDO queries for assignment CRUD, progress logging |
| `src/dao/WorkRequestDAO.php` | Raw PDO queries for cross-dept/cross-faculty/upward requests |
| `src/services/WorkloadService.php` | Capacity calculation and overload detection logic |
| `src/dao/StudentRequestDAO.php` | Raw PDO queries for student supervisor requests |
| `src/dao/AppealDAO.php` | Raw PDO queries for workload appeal CRUD |
| `src/dao/NotificationDAO.php` | Raw PDO queries for in-app notifications |
| `src/dao/AuditLogDAO.php` | Raw PDO queries for audit log entries |
| `src/models/User.php` | OOP model class with getters/setters |

#### B.6 Key API Endpoints (PHP)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/login` | Login and receive JWT with role claim | No |
| GET | `/api/users` | List users (scoped to caller's faculty/dept by role) | Yes |
| POST | `/api/users` | Create a new user account | Yes (Admin, Dean, Dept Head) |
| GET | `/api/faculties` | List all faculties | Yes (Admin, Dean) |
| GET | `/api/departments` | List departments (scoped by faculty) | Yes |
| POST | `/api/assignments` | Create and assign work to a lecturer/dept head | Yes (Dean, Dept Head) |
| GET | `/api/assignments` | List assignments (scoped to caller's role/dept) | Yes |
| PATCH | `/api/assignments/{id}/progress` | Update assignment progress percentage and note | Yes (Lecturer) |
| GET | `/api/capacity/{userId}` | Get a user's workload capacity summary | Yes (Dean, Dept Head) |
| POST | `/api/work-requests` | Submit a cross-dept, cross-faculty, or upward request | Yes |
| GET | `/api/work-requests` | List incoming requests for the caller | Yes |
| PATCH | `/api/work-requests/{id}` | Approve or reject a work request | Yes (Dean, Dept Head) |
| POST | `/api/appeals` | Submit a workload appeal | Yes (Lecturer) |
| GET | `/api/appeals` | List appeals (scoped by role) | Yes |
| PATCH | `/api/appeals/{id}` | Review or resolve an appeal | Yes (Dept Head, Dean) |
| POST | `/api/student-requests` | Submit a student project/thesis supervisor request | Yes (Student) |
| GET | `/api/student-requests` | List student requests (scoped by role) | Yes |
| PATCH | `/api/student-requests/{id}` | Assign or reject a student request | Yes (Dean) |
| GET | `/api/notifications` | List notifications for the caller | Yes |
| PATCH | `/api/notifications/{id}/read` | Mark a notification as read | Yes |
| POST | `/api/promotions` | Initiate or approve a role promotion | Yes (Dean, Admin) |
| GET | `/api/audit-logs` | List all audit log entries | Yes (Admin) |

---

## 5. Frontend Setup (Next.js)

#### 5.1 Navigate to the frontend directory

```bash
cd frontend
```

#### 5.2 Install JavaScript dependencies

```bash
npm install
```

#### 5.3 Configure environment variables

Create a `.env.local` file in the `frontend/` directory:

```env
# --- API Configuration ---
# Use port 8080 if backend is Java (Servlets on Tomcat)
# Use port 8000 if backend is PHP (Vanilla PHP)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api

# --- App Settings ---
NEXT_PUBLIC_APP_NAME=UniAlloc
NEXT_PUBLIC_APP_DESCRIPTION=University Dean Office Human Resource Allocation System

# --- Auth ---
NEXTAUTH_SECRET=a-random-secret-string-for-session-encryption
NEXTAUTH_URL=http://localhost:3000
```

#### 5.4 Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the UniAlloc login page.

#### 5.5 Build for production (optional)

```bash
npm run build
npm start
```

---

## 6. Running the Full Application

To run the complete stack, you need **three terminals** (or background processes) running simultaneously:

```
Terminal 1 — MySQL Server (usually auto-running as a service)
Terminal 2 — Backend API server
Terminal 3 — Frontend dev server
```

### Quick-Start Checklist

```
[1] Ensure MySQL service is running and uniAlloc_db exists with seeded data

[2] Start the backend:
    (Java)  cd backend-java && mvn tomcat7:run
            OR deploy unialloc.war to Tomcat webapps/
    (PHP)   cd backend-php && php -S localhost:8000 -t public/

[3] Start the frontend:
    cd frontend && npm run dev

[4] Open http://localhost:3000 in your browser

[5] Login with a test account from the table below
```

---

## 7. Default Test Accounts

After running the database seed script, the following test accounts are available. All accounts are active and ready to use immediately.

| Role | Email | Password | Scope |
|---|---|---|---|
| **System Admin** | `admin@university.edu` | `Admin@123` | Full system control; promotes users to Dean; manages audit logs and settings |
| **Dean (Faculty of Computing)** | `dean.computing@university.edu` | `Dean@123` | Manages all departments and lecturers within Faculty of Computing |
| **Dean (Faculty of Engineering)** | `dean.engineering@university.edu` | `Dean@123` | Manages all departments and lecturers within Faculty of Engineering |
| **Department Head (CS Dept)** | `head.cs@university.edu` | `Head@123` | Manages lecturers in the Computer Science department |
| **Department Head (SE Dept)** | `head.se@university.edu` | `Head@123` | Manages lecturers in the Software Engineering department |
| **Lecturer** | `lecturer1@university.edu` | `Lecturer@123` | Assigned to Computer Science department |
| **Lecturer** | `lecturer2@university.edu` | `Lecturer@123` | Assigned to Software Engineering department |
| **Student** | `student@university.edu` | `Student@123` | Can submit supervisor requests to the Faculty of Computing Dean |

> ### ⚠️ These are LOCAL DEVELOPMENT credentials only
>
> These passwords are published in this repository, so **every account above must
> be considered public**. Never load `seed.sql` into a deployment that holds real
> staff or student data.
>
> Before any shared or production deployment:
> 1. Load `schema.sql` **without** `seed.sql`, and create the first admin manually.
> 2. If seed data was ever loaded, change every password above immediately —
>    a password reset also bumps `token_version`, which signs out any session
>    that was already using the old credentials.
> 3. Set a unique `JWT_SECRET` and `APP_KEY` in `backend-php/.env`
>    (see `backend-php/.env.example`) — never reuse the values from another machine.

### Testing Cross-Boundary Workflows

Use these accounts together to verify the key workflows:

| Workflow to Test | Accounts Involved |
|---|---|
| Cross-department request | `head.cs` submits a request to `head.se` for their lecturer |
| Cross-faculty request | `dean.computing` submits a request to `dean.engineering` |
| Student request flow | `student` submits a request; `dean.computing` reviews and assigns `lecturer1` |
| Workload appeal | `lecturer1` files an appeal; `head.cs` reviews it; `dean.computing` resolves if escalated |
| Lecturer promotion | `dean.computing` promotes `lecturer1` to Department Head |
| Dept Head to Dean promotion | `admin` approves promotion of a Department Head to Dean role |

---

## 8. Environment Variables Reference

### Backend (Java — `resources/db.properties`)

| Variable | Description | Default |
|---|---|---|
| `db.url` | JDBC connection string | `jdbc:mysql://localhost:3306/uniAlloc_db` |
| `db.username` | MySQL username | `root` |
| `db.password` | MySQL password | *(set in config)* |
| `db.driver` | JDBC driver class | `com.mysql.cj.jdbc.Driver` |
| `jwt.secret` | Secret key for signing JWT tokens | *(must be set — use a 256-bit random string)* |
| `jwt.expiration` | Token expiry in milliseconds | `86400000` (24h) |
| `overload.threshold.percent` | Capacity % at which overload alert fires | `90` |

### Backend (PHP — `backend-php/.env`, gitignored)

| Variable | Description | Default |
|---|---|---|
| `DB_HOST` | Database host | `127.0.0.1` |
| `DB_PORT` | Database port | `3306` |
| `DB_NAME` | Database name | `uniAlloc_db` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | *(empty)* |
| `JWT_SECRET` | Signing key for JWTs — **required**, 64 hex chars | *(none; app refuses to start)* |
| `JWT_TTL` | Token expiry in minutes | `480` (8h) |
| `APP_KEY` | AES-256-GCM key encrypting TOTP secrets — **required** | *(none; app refuses to start)* |
| `APP_DEBUG` | Return raw exception messages in API errors | `false` |
| `CORS_ORIGINS` | Comma-separated allowed browser origins | `http://localhost:3000` |
| `REGISTRATION_EMAIL_DOMAIN` | Restrict student self-registration to one domain | *(blank = any)* |
| `OVERLOAD_THRESHOLD_PCT` | Capacity % at which overload alert fires | `90` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:8080/api` |
| `NEXT_PUBLIC_APP_NAME` | Application display name | `UniAlloc` |
| `NEXT_PUBLIC_APP_DESCRIPTION` | Application subtitle | `University Dean Office HR Allocation System` |
| `NEXTAUTH_SECRET` | Session encryption secret | *(must be set)* |
| `NEXTAUTH_URL` | Frontend base URL | `http://localhost:3000` |

---

## 9. Common Issues & Troubleshooting

### MySQL Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Fix:** Ensure MySQL service is running:
- Windows: `net start mysql80` or start via XAMPP Control Panel
- macOS: `brew services start mysql`
- Linux: `sudo systemctl start mysql`

---

### Database Not Found / Table Does Not Exist

```
Error: Unknown database 'uniAlloc_db'
```
or
```
Error: Table 'uniAlloc_db.users' doesn't exist
```

**Fix:** You must create the database and run the schema and seed scripts before starting the backend. Follow Section 3 in order:

```bash
# 1. Create the database uniAlloc_db
# 2. Import the schema
mysql -u root uniAlloc_db < database/schema.sql
# 3. Import the seed data
mysql -u root uniAlloc_db < database/seed.sql
```

---

### CORS Errors in Browser Console

```
Access-Control-Allow-Origin header missing
```

**Fix:** Ensure the backend CORS configuration includes `http://localhost:3000`:
- **Java:** Check your custom `CorsFilter` servlet filter settings in `web.xml` and the filter class
- **PHP:** Check the CORS headers set in `public/index.php` or your middleware; verify `cors_origins` in `config/app.php`

---

### JWT Token Expired or Invalid

```
401 Unauthorized — Token expired
```

**Fix:** Login again to obtain a fresh token. Check that `jwt.expiration` (Java) or `jwt_ttl` (PHP) is set to a reasonable value (e.g., 24 hours = `86400000` ms or `1440` minutes).

---

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Fix:** Kill the process occupying the port:
- Windows: `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`
- macOS/Linux: `lsof -ti:3000 | xargs kill -9`

Or start the frontend on a different port: `npm run dev -- -p 3001`

---

### Maven Wrapper Permission Denied (macOS/Linux)

```
./mvnw: Permission denied
```

**Fix:** Make the wrapper executable:
```bash
chmod +x mvnw
```

---

### Overload Alert Not Firing

**Symptom:** A lecturer has more hours assigned than their `capacity_hours` value, but no notification is triggered.

**Fix:** Verify:
1. The `capacity_hours` field on the lecturer's user record is set to a non-zero value in the database.
2. The `overload.threshold.percent` (Java) or `overload_threshold_pct` (PHP) is correctly set in the backend config.
3. The `WorkloadService` is being called after every successful assignment creation — check that the assignment creation endpoint invokes the workload check before returning a 201 response.

---

### Student Request Not Reaching Dean

**Symptom:** A student submits a request but the Dean sees nothing in their inbox.

**Fix:** Verify:
1. The student's user record has a `department_id` set in the database.
2. The department record has a `faculty_id` that maps to the correct faculty.
3. The faculty record has a `dean_id` pointing to the Dean's user ID.
4. The `student_requests` table row has the correct `faculty_id` populated at insert time.

---

## 10. Development Tools & Recommendations

| Tool | Purpose | Link |
|---|---|---|
| **VS Code** | Primary code editor | [code.visualstudio.com](https://code.visualstudio.com/) |
| **IntelliJ IDEA** | Java IDE (recommended for Option A) | [jetbrains.com](https://www.jetbrains.com/idea/) |
| **MySQL Workbench** | Visual database design, ER diagram creation, and query browser | [dev.mysql.com](https://dev.mysql.com/downloads/workbench/) |
| **Postman** | API endpoint testing and collection documentation | [postman.com](https://www.postman.com/) |
| **Figma** | UI/UX wireframing and prototyping | [figma.com](https://www.figma.com/) |
| **dbdiagram.io** | Online ER diagram tool with SQL export | [dbdiagram.io](https://dbdiagram.io/) |
| **draw.io** | General-purpose diagramming (Use Case, Class, Sequence, Activity diagrams) | [draw.io](https://app.diagrams.net/) |
| **GitHub Desktop** | Visual Git client for version control | [desktop.github.com](https://desktop.github.com/) |

### Recommended VS Code Extensions

- **ES7+ React/Redux/React-Native snippets** — Fast component scaffolding
- **Tailwind CSS IntelliSense** — Autocomplete for Tailwind classes
- **Java Extension Pack / PHP Intelephense** — Language support for your chosen backend
- **MySQL (by cweijan)** — Database browser inside VS Code
- **Thunder Client** — Lightweight API tester (Postman alternative, works offline)
- **GitLens** — Enhanced Git history and blame annotations inside the editor

---

<div align="center">

**Need help?** Open an issue on the GitHub repository or contact the development team.

</div>
