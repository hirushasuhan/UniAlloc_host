<div align="center">

# UniAlloc — Setup & Installation Guide

**Complete step-by-step instructions to get the University Dean's Office HR Allocation System running on your local machine.**

[![Next.js 14](https://img.shields.io/badge/Frontend-Next.js%2014.2.35-black?style=flat&logo=next.js)](https://nextjs.org/)
[![PHP 8.2.35+](https://img.shields.io/badge/Backend-PHP%208.2.35+%20(PDO)-777bb4?style=flat&logo=php&logoColor=white)](https://www.php.net/)
[![MySQL 8.0](https://img.shields.io/badge/Database-MySQL%208.0-4479a1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)

</div>

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Architecture & Repository Structure](#2-project-architecture--repository-structure)
3. [Database Setup (MySQL 8.x)](#3-database-setup-mysql-8x)
4. [Backend Setup (Vanilla PHP 8.2 + PDO)](#4-backend-setup-vanilla-php-82--pdo)
5. [Frontend Setup (Next.js 14)](#5-frontend-setup-nextjs-14)
6. [Running the Full Application](#6-running-the-full-application)
7. [Default Test Accounts](#7-default-test-accounts)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Common Issues & Troubleshooting](#9-common-issues--troubleshooting)
10. [Development Tools & Extensions](#10-development-tools--extensions)

---

## 1. Prerequisites

Ensure the following software packages are installed before proceeding:

| Software | Minimum Version | Purpose | Download |
|---|---|---|---|
| **Node.js** | v18.17+ (LTS) | Next.js frontend runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | v9+ (ships with Node) | Frontend package manager | Included with Node.js |
| **PHP** | 8.2.35+ / 8.3.36+ / 8.4.27+ | Backend REST API runtime (Patched against PHP2Shell CVE-2026-109618/19) | [php.net](https://www.php.net/downloads) or [apachefriends.org](https://www.apachefriends.org/) |
| **MySQL Server** | 8.0+ | Relational database engine | [dev.mysql.com](https://dev.mysql.com/downloads/mysql/) |
| **Git** | 2.40+ | Version control | [git-scm.com](https://git-scm.com/) |

### Verify Installations

Open your terminal (PowerShell, Command Prompt, or Bash) and execute:

```bash
node -v          # Expected: v18.x or v20.x
npm -v           # Expected: 9.x or higher
php -v           # Expected: PHP 8.2.35+ or 8.3.36+ (PHP2Shell patched)
mysql --version  # Expected: MySQL 8.x
git --version    # Expected: Git 2.x
```

> **PHP Extension Checklist:** Ensure `pdo_mysql`, `openssl`, and `mbstring` extensions are enabled in your `php.ini`. (In XAMPP, click Apache -> Config -> `php.ini` and verify that `extension=pdo_mysql` and `extension=openssl` do not have a leading semicolon `;`).

---

## 2. Project Architecture & Repository Structure

UniAlloc follows a strict decoupled architecture:

```
UniAlloc_host/
├── backend-php/        # Hand-coded Vanilla PHP 8.2+ REST API (PDO, no frameworks)
│   ├── config/         # Database and application configuration
│   ├── public/         # Public web root & custom front router (index.php)
│   ├── src/
│   │   ├── controllers/# Route request controllers
│   │   ├── dao/        # Data Access Objects (Raw SQL with PDO Prepared Statements)
│   │   ├── helpers/    # Crypto, TOTP, JWT, Password & Validation policies
│   │   ├── middleware/ # JWT authentication & RBAC middleware
│   │   └── services/   # Business logic (WorkloadService, Overload calculation)
│   ├── .env.example    # Environment variable template
│   └── wasmer.toml     # Optional serverless deployment descriptor
│
├── frontend/           # Modern Next.js 14 React Application
│   ├── src/
│   │   ├── app/        # App router (role-scoped dashboards: admin, dean, department-head, lecturer, student)
│   │   ├── components/ # Reusable UI components, widgets, modals, capacity charts
│   │   ├── hooks/      # React hooks for API consumption and state
│   │   └── lib/        # API clients, auth helpers, token management
│   ├── public/         # Static assets (logos, badges, icons)
│   └── package.json    # Frontend dependencies and scripts
│
├── database/           # Relational schema, seed datasets, and migration scripts
│   ├── schema.sql      # Base DDL schema (14 tables with referential integrity)
│   ├── seed.sql        # Initial test accounts and organizational hierarchies
│   ├── apply_pending_migrations.sql # Idempotent migration runner (migrations 01-10)
│   └── rotate_demo_credentials.sql  # Credential rotation tool
│
├── docs/               # Technical documentation & Interactive UML Diagrams
│   ├── usecase_diagram.html  # Interactive UML 2.5 Use Case Diagram (SVG)
│   ├── class_diagram.html    # Interactive UML 2.5 Class Diagram (SVG)
│   ├── er_diagram.html       # Interactive Crow's Foot ER Diagram (SVG)
│   ├── SYSTEM_DOCUMENTATION.md # Comprehensive System Specifications
│   ├── setup.md        # This Setup & Installation Guide
│   └── README.md       # Project Overview
└── README.md           # Root repository overview & quickstart
```

---

## 3. Database Setup (MySQL 8.x)

### 3.1 Start MySQL Service

- **Windows Service:** Open Services -> Start `MySQL80` (or `net start mysql80` in Administrator Command Prompt).
- **XAMPP:** Open XAMPP Control Panel and click **Start** next to MySQL.
- **Linux/macOS:** `sudo systemctl start mysql` or `brew services start mysql`.

### 3.2 Create the Database

Log in to MySQL as root or an administrative user:

```bash
mysql -u root -p
```

Execute the following SQL commands:

```sql
CREATE DATABASE IF NOT EXISTS `uniAlloc_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

EXIT;
```

### 3.3 Import Schema & Apply Migrations

Run the SQL scripts in order from your terminal:

```bash
# 1. Load the Base Schema (All 14 core tables)
mysql -u root -p uniAlloc_db < database/schema.sql

# 2. Apply all pending security and feature migrations (01 through 10)
mysql -u root -p uniAlloc_db < database/apply_pending_migrations.sql

# 3. Seed default roles, faculties, departments, and demo accounts
mysql -u root -p uniAlloc_db < database/seed.sql
```

*(If your local MySQL root user has no password, simply omit the `-p` flag).*

---

## 4. Backend Setup (Vanilla PHP 8.2.35+ + PDO)

> [!IMPORTANT]
> **PHP2Shell Security Mitigation:** The backend requires **PHP 8.2.35+**, **PHP 8.3.36+**, or **PHP 8.4.27+** to eliminate the critical core PHP2Shell interpreter flaws (**CVE-2026-109618** and **CVE-2026-109619**). In addition, `.htaccess` and `index.php` enforce defense-in-depth by disabling `session.upload_progress` and refusing any unexpected `multipart/form-data` bodies.

### 4.1 Configure Environment Variables

Navigate to the `backend-php/` directory:

```bash
cd backend-php
cp .env.example .env
```

Generate two secure 256-bit cryptographic keys using PHP:

```bash
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"   # Generates JWT_SECRET
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"   # Generates APP_KEY
```

Open `backend-php/.env` in your code editor and configure:

```ini
APP_DEBUG=true
JWT_SECRET=<paste_first_generated_64_hex_string_here>
JWT_TTL=480
APP_KEY=<paste_second_generated_64_hex_string_here>
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=uniAlloc_db
DB_USER=root
DB_PASSWORD=
CORS_ORIGINS=http://localhost:3000
REGISTRATION_EMAIL_DOMAIN=
OVERLOAD_THRESHOLD_PCT=90
```

> **Security Note:** Never commit `backend-php/.env`. `JWT_SECRET` signs authentication tokens; `APP_KEY` encrypts user TOTP authenticator secrets at rest.

### 4.2 Start the Backend Development Server

Run PHP's high-performance built-in web server pointing to the `public/` directory:

```bash
php -S localhost:8000 -t public/
```

Verify the API is operational by opening:
[http://localhost:8000/api/health](http://localhost:8000/api/health)

Expected response:
```json
{
  "status": "UP",
  "database": "connected"
}
```

---

## 5. Frontend Setup (Next.js 14)

### 5.1 Install Frontend Dependencies

Open a new terminal window, navigate to the `frontend/` directory, and install dependencies:

```bash
cd frontend
npm install
```

### 5.2 Configure Frontend Environment

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_NAME=UniAlloc
NEXT_PUBLIC_APP_DESCRIPTION=University Dean's Office HR Allocation System
```

### 5.3 Start the Frontend Development Server

```bash
npm run dev
```

Open your browser at:
[http://localhost:3000](http://localhost:3000)

The UniAlloc portal login screen will load.

---

## 6. Running the Full Application

For active local development, keep two processes running:

```
┌─────────────────────────────────────────────────────────────┐
│ Terminal 1: Backend API (PHP 8.2)                           │
│ cd backend-php && php -S localhost:8000 -t public/          │
│ Running on: http://localhost:8000                           │
├─────────────────────────────────────────────────────────────┤
│ Terminal 2: Frontend (Next.js 14)                           │
│ cd frontend && npm run dev                                  │
│ Running on: http://localhost:3000                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Default Test Accounts

The seed script creates ready-to-test accounts representing all 5 roles:

| Role | Email | Password | Scope & Responsibilities |
|---|---|---|---|
| **System Admin** | `admin@university.edu` | `Admin@123` | Full system governance, User CRUD, Audit logs, Promote to Dean |
| **Dean** (Computing) | `dean.computing@university.edu` | `Dean@123` | Faculty overview, Cross-faculty requests, Student request supervisor assignment |
| **Dean** (Engineering) | `dean.engineering@university.edu` | `Dean@123` | Engineering faculty management |
| **Department Head** (CS) | `head.cs@university.edu` | `Head@123` | CS lecturer workload monitoring, task allocation, student request endorsement (step 1) |
| **Department Head** (SE) | `head.se@university.edu` | `Head@123` | SE department management |
| **Lecturer** (CS) | `lecturer1@university.edu` | `Lecturer@123` | Progress slider updates (0-100%), task notes, workload appeal filing |
| **Lecturer** (SE) | `lecturer2@university.edu` | `Lecturer@123` | Workload monitoring, upward work requests |
| **Student** | `student@university.edu` | `Student@123` | Submit project/thesis supervisor request & real-time tracker |

> **Development Notice:** These default credentials are for local development and testing only. To rotate demo credentials, run `database/rotate_demo_credentials.sql`.

---

## 8. Environment Variables Reference

### Backend (`backend-php/.env`)

| Variable | Type | Description | Default |
|---|---|---|---|
| `DB_HOST` | String | MySQL host address | `127.0.0.1` |
| `DB_PORT` | Integer | MySQL connection port | `3306` |
| `DB_NAME` | String | Database schema name | `uniAlloc_db` |
| `DB_USER` | String | Database username | `root` |
| `DB_PASSWORD` | String | Database user password | *(empty)* |
| `JWT_SECRET` | String (64 hex) | Cryptographic signature key for authentication JWTs | *(Required)* |
| `JWT_TTL` | Integer | Token lifespan in minutes | `480` (8 Hours) |
| `APP_KEY` | String (64 hex) | AES-256-GCM symmetric key for TOTP secrets | *(Required)* |
| `APP_DEBUG` | Boolean | Expose server-side exception detail | `true` (dev) / `false` (prod) |
| `CORS_ORIGINS` | String | Permitted frontend origins | `http://localhost:3000` |
| `OVERLOAD_THRESHOLD_PCT` | Integer | Workload % at which overload warning fires | `90` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Value |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base endpoint for REST calls | `http://localhost:8000/api` (dev) / `https://backend-php.wasmer.app/api` (prod) |
| `NEXT_PUBLIC_APP_NAME` | Branding application title | `UniAlloc` |

---

## 9. Production Hosting & Cloudflare Security Configuration

For live deployments, UniAlloc uses a secure multi-tier hosting architecture:

| Component | Provider | Live URL | Security Role |
|---|---|---|---|
| **DNS & Perimeter** | Cloudflare | `https://www.unialloc.app` | Anycast Edge Reverse Proxy, DDoS Mitigation, WAF, Full (Strict) SSL/TLS 1.3 |
| **Frontend Mirror** | Vercel | `https://uniallocsystem.vercel.app` | Next.js Serverless Edge Runtime |
| **Backend REST API**| Wasmer Edge | `https://backend-php.wasmer.app/api` | Sandboxed WASI/PHP 8.2 Execution Environment |

### Cloudflare Edge Proxy Setup
1. **Proxy Status:** Enable **Proxied (Orange Cloud)** on `unialloc.app` (Apex) and `www.unialloc.app` CNAME records pointing to `cname.vercel-dns.com`.
2. **SSL/TLS Mode:** Set encryption mode to **Full (Strict)** to ensure end-to-end cryptographic transit between Cloudflare and Vercel.
3. **Security Rules:** Enable **Bot Fight Mode**, **Always Use HTTPS**, and **Automatic HTTPS Rewrites**.
4. **CORS:** Ensure `CORS_ORIGINS` in the backend environment contains `https://unialloc.app,https://www.unialloc.app,https://uniallocsystem.vercel.app`.

---

## 10. Common Issues & Troubleshooting

### 1. `SQLSTATE[HY000] [2002] Connection refused`
- **Cause:** MySQL service is not running or port 3306 is occupied.
- **Solution:** Verify MySQL status via XAMPP Control Panel or run `net start mysql80` (Windows) / `sudo systemctl status mysql` (Linux).

### 2. `Database schema is out of date — a required table or column is missing`
- **Cause:** Migrations have not been applied to `uniAlloc_db`.
- **Solution:** Run the automated idempotent migration script:
  ```bash
  mysql -u root uniAlloc_db < database/apply_pending_migrations.sql
  ```

### 3. `JWT_SECRET or APP_KEY is missing`
- **Cause:** `backend-php/.env` was not created or keys are empty.
- **Solution:** Copy `backend-php/.env.example` to `backend-php/.env` and generate both 64-hex keys using `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`.

### 4. `CORS header 'Access-Control-Allow-Origin' missing`
- **Cause:** The frontend URL does not match `CORS_ORIGINS` in `backend-php/.env`.
- **Solution:** Ensure `CORS_ORIGINS=http://localhost:3000` in `.env`.

### 5. `Call to undefined function openssl_encrypt()` or `could not find driver`
- **Cause:** Required PHP extensions are commented out in `php.ini`.
- **Solution:** Open your `php.ini` file, find lines `;extension=pdo_mysql` and `;extension=openssl`, remove the semicolon `;` at the beginning of each line, and restart the PHP process.

---

## 10. Development Tools & Extensions

- **IDE:** [Visual Studio Code](https://code.visualstudio.com/)
- **Recommended Extensions:**
  - `PHP Intelephense` (bmewburn.vscode-intelephense-client)
  - `Tailwind CSS IntelliSense` (bradlc.vscode-tailwindcss)
  - `ESLint` (dbaeumer.vscode-eslint)
- **API Testing:** Postman or Thunder Client
- **Database GUI:** MySQL Workbench or phpMyAdmin

---

<div align="center">

**UniAlloc System Documentation & Diagrams**
[Use Case Diagram](usecase_diagram.html) · [Class Diagram](class_diagram.html) · [ER Diagram](er_diagram.html) · [System Documentation](SYSTEM_DOCUMENTATION.md)

</div>
