# CareSync — Technical Documentation

> **Version:** 1.0.0 | **Last Updated:** March 2026 | **Classification:** Internal / Production Reference

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [System Architecture](#2-system-architecture)
3. [User Roles and Workflows](#3-user-roles-and-workflows)
4. [Database Design](#4-database-design)
5. [API Endpoints](#5-api-endpoints)
6. [Real-Time Communication (Socket.IO)](#6-real-time-communication-socketio)
7. [Deployment Architecture](#7-deployment-architecture)
8. [Security Considerations](#8-security-considerations)
9. [Future Scalability](#9-future-scalability)

---

## 1. System Overview

### 1.1 Product Description

**CareSync** is a real-time ICU reservation and emergency transport coordination platform built for the healthcare sector. It connects patients, ambulance crews, hospital receptionists, hospital managers, and system administrators through a unified, role-aware web application.

The platform enables:

- Online ICU bed reservation with real-time availability tracking
- Ambulance dispatch and GPS-based tracking
- Patient admission lifecycle management (reservation → ambulance → check-in → discharge)
- Hospital operations management (staff, ICU inventory, fees)
- Cross-role coordination via real-time WebSocket events

### 1.2 Key Capabilities

| Capability | Description |
|---|---|
| ICU Reservation | Patients or receptionists book specific ICU beds by specialization |
| Ambulance Coordination | Patients request ambulances; nearby crews accept and track pickups in real time |
| Patient Lifecycle | Full admission flow: reservation → ambulance pickup → check-in → fee management → discharge |
| Hospital Management | Admins create hospitals; managers register ICU rooms, manage receptionists and ambulance staff |
| Real-Time Updates | Socket.IO broadcasts status changes to all connected stakeholders instantly |
| Role-Based Access | JWT + RBAC enforced on every endpoint; each role sees only its authorized views |
| Geographic Awareness | GeoJSON + 2dsphere indexes enable distance-sorted ambulance dispatch and nearby-hospital search |

### 1.3 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + Vite | React 18.2, Vite 5.4 |
| UI Routing | React Router | v6 |
| Maps | Leaflet.js | — |
| Backend | Node.js + Express | Express 4.21 |
| Real-Time | Socket.IO | 4.8 |
| Database | MongoDB + Mongoose | MongoDB 7, Mongoose 8.6 |
| Authentication | JSON Web Tokens (JWT) | bcryptjs + jsonwebtoken |
| Containerization | Docker + Docker Compose | — |
| CI/CD | GitHub Actions | — |
| Cloud | AWS (EC2 / EKS) | us-east-1 |
| Reverse Proxy | Nginx | Alpine |
| IaC | Terraform | — |
| Orchestration | Kubernetes (k8s) | — |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Browser                              │
│              React SPA (Vite) — Role-aware UI                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  HTTP/HTTPS + WebSocket (Socket.IO)
                ┌──────────▼──────────────────┐
                │        Nginx                │
                │  Reverse Proxy / TLS Term.  │
                │  Rate Limiting (10 rps API) │
                └──────────┬──────────────────┘
                           │
          ┌────────────────┼────────────────────┐
          │                │                    │
   ┌──────▼──────┐  ┌──────▼──────┐    ┌───────▼──────┐
   │  Static     │  │  REST API   │    │  Socket.IO   │
   │  Assets     │  │  Express    │    │  Server      │
   │  (React)    │  │  Port 3030  │    │  Port 3030   │
   └─────────────┘  └──────┬──────┘    └──────────────┘
                           │
                  ┌────────▼────────┐
                  │    MongoDB      │
                  │   Port 27017    │
                  │  (Mongoose ODM) │
                  └─────────────────┘
```

### 2.2 Repository Structure

```
CareSync/
├── backend/                  # Node.js/Express API server
│   ├── index.js              # Entry point, middleware, Socket.IO setup
│   ├── controllers/          # Business logic (7 controllers)
│   ├── routes/               # Express routers (9 route files)
│   ├── models/               # Mongoose schemas (6 models)
│   ├── utils/                # Auth middleware, JWT, error handler, sanitizer
│   ├── seeds/                # Database seeding scripts
│   └── Dockerfile
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── pages/            # Role-grouped page components
│   │   ├── components/       # Shared UI components
│   │   ├── utils/            # API client, auth helpers, Socket.IO client
│   │   ├── hooks/            # Custom React hooks
│   │   ├── contexts/         # React context providers
│   │   └── routes/           # React Router configuration
│   ├── nginx.conf            # Production Nginx config for SPA
│   └── Dockerfile
├── Deploy/                   # Deployment configurations
│   ├── docker-compose.yml    # Production Compose file
│   ├── docker-compose.local.yml
│   ├── docker-compose.atlas.yml
│   ├── docker-compose.production.yml
│   ├── nginx/nginx.conf      # Reverse proxy Nginx config
│   └── [deployment guides & scripts]
├── k8s/                      # Kubernetes manifests
├── terraform/                # AWS infrastructure as code
└── .github/workflows/        # GitHub Actions CI/CD pipelines
    ├── deploy.yml            # Main build + deploy pipeline
    └── deploy-ec2.yml        # EC2-targeted deployment
```

### 2.3 Backend Module Map

```
index.js
  ├── Security middleware stack
  │     ├── helmet (HTTP security headers)
  │     ├── rateLimit (global: 1000 req/hr, auth: 10 attempts/15 min)
  │     ├── mongoSanitize (NoSQL injection prevention)
  │     ├── hpp (HTTP Parameter Pollution prevention)
  │     ├── cors (dynamic origin validation)
  │     └── sanitizeRequest (custom XSS sanitizer)
  ├── Routes
  │     ├── /admin        → adminRoutes.js
  │     ├── /patient      → patientRoutes.js
  │     ├── /manager      → managerRoutes.js
  │     ├── /receptionist → receptionistRoutes.js
  │     ├── /ambulance    → ambulanceRoutes.js
  │     ├── /user         → userRoutes.js
  │     ├── /hospital     → hospitalRoutes.js
  │     ├── /icu          → icuRoutes.js
  │     └── /meta         → metaRoutes.js
  └── Socket.IO server
        └── hospitalAdded broadcast event
```

---

## 3. User Roles and Workflows

### 3.1 Role Overview

CareSync implements five distinct user roles, each with its own set of permissions, UI views, and accessible API endpoints.

| Role | Description | Key Permissions |
|---|---|---|
| **Admin** | System-wide administrator | Manage hospitals, create managers/admins, block/unblock users and hospitals |
| **Manager** | Hospital operations manager | Manage ICU inventory, create receptionists, view staff, assign backup manager |
| **Receptionist** | Front-desk hospital staff | Approve ICU requests, check-in/check-out patients, manage fees |
| **Patient** | End-user seeking care | Reserve ICU beds, request ambulances, view medical history, rate hospitals |
| **Ambulance** | Emergency transport crew | View available pickup requests, accept requests, update transport status |

### 3.2 Admin Workflow

```
Admin Login
    │
    ├── Create Hospital  ──────────────────► Hospital added to system
    │     └── Assign Manager to Hospital
    │
    ├── Create Manager/Admin Accounts
    │
    ├── Block / Unblock Hospitals
    │
    ├── Block / Unblock Users
    │
    ├── View All Hospitals (with feedback & ratings)
    │
    └── Search Managers / Hospitals
```

### 3.3 Manager Workflow

```
Manager Login
    │
    ├── View Assigned Hospital
    │
    ├── Register ICU Rooms  ──────────────► ICU rooms available for reservation
    │     └── Update / Delete ICU Rooms
    │
    ├── Create Receptionist Accounts
    │     └── Update / Delete Receptionists
    │
    ├── Assign Backup Manager
    │
    └── Calculate Patient Fees
```

### 3.4 Patient Workflow

```
Patient Registration / Login
    │
    ├── Browse Available ICU Beds  (public endpoint, no auth required)
    │
    ├── Reserve ICU Bed  ──────────────────► Bed marked as reserved
    │     └── Optionally request ambulance pickup
    │
    ├── Request Ambulance  ────────────────► AmbulanceRequest created (pending)
    │     └── Nearest available ambulance accepts
    │
    ├── Track Ambulance  (real-time status updates)
    │
    ├── Arrive at Hospital  ───────────────► Receptionist checks in patient
    │
    ├── Receive Treatment (ICU stay)
    │
    ├── Fee Calculation & Payment Confirmation
    │
    ├── Discharge  ────────────────────────► ICU bed freed; record updated
    │
    └── Submit Hospital Rating / Feedback
```

### 3.5 Ambulance Workflow

```
Ambulance Login
    │
    ├── View Active Pickup Requests  ──────► Requests sorted by proximity
    │
    ├── Accept Request  ────────────────────► Request status → accepted
    │     └── Patient notified in real time
    │
    ├── Navigate to Patient  (Leaflet map)
    │
    ├── Notify Patient — Ambulance Waiting
    │
    ├── Patient Boards Ambulance  ─────────► Status → in_transit
    │
    └── Mark Patient Arrived at Hospital  ─► Status → arrived / completed
```

### 3.6 Receptionist Workflow

```
Receptionist Login
    │
    ├── View ICU Requests (pending reservations)
    │
    ├── Approve ICU Request  ──────────────► Assigns ambulance if pickup needed
    │
    ├── Check-In Patient  ─────────────────► ICU status → Occupied; patient checked in
    │
    ├── Calculate Fees
    │
    ├── Mark Fees Paid
    │
    └── Check-Out / Discharge Patient  ───► ICU status → Available; patient record closed
```

### 3.7 Patient Status State Machine

```
          ┌──────────┐
          │  (start) │
          └────┬─────┘
               │ reserves ICU
               ▼
         ┌──────────┐
         │ RESERVED │
         └────┬─────┘
              │ requests ambulance
              ▼
      ┌───────────────┐
      │AWAITING_PICKUP│
      └───────┬───────┘
              │ ambulance accepts
              ▼
        ┌────────────┐
        │ IN_TRANSIT │
        └─────┬──────┘
              │ arrives at hospital
              ▼
          ┌─────────┐
          │ ARRIVED │
          └────┬────┘
               │ receptionist checks in
               ▼
         ┌──────────────┐
         │  CHECKED_IN  │
         └──────┬───────┘
                │ discharge
                ▼
         ┌───────────────┐
         │  CHECKED_OUT  │
         └───────────────┘
```

---

## 4. Database Design

### 4.1 Overview

CareSync uses MongoDB 7 with Mongoose ODM. GeoJSON Point types with `2dsphere` indexes are used throughout for location-aware queries (nearest hospital, nearest ambulance).

**Collections:**

| Collection | Model Name | Purpose |
|---|---|---|
| `users` | `User` | All roles — polymorphic schema |
| `hospitals` | `Hospital` | Hospital records |
| `iCUrooms` | `ICURoom` | ICU bed inventory |
| `rooms` | `Room` | General rooms (visitor, kids area) |
| `ambulancerequests` | `AmbulanceRequest` | Patient pickup requests |
| `services` | `Service` | Bookable hospital services |
| `feedbacks` | `Feedback` | Patient hospital ratings |

### 4.2 User Model (Polymorphic)

All five roles share a single `users` collection with role-specific fields.

```
users
├── userId            Number   Auto-incremented (mongoose-sequence)
├── userName          String   Unique, min 2 chars
├── firstName         String   Required
├── lastName          String   Required
├── email             String   Unique, validated
├── gender            String   "Male" | "Female"
├── phone             String   Required
├── userPass          String   bcryptjs hashed, select: false
├── role              String   "Patient" | "Admin" | "Manager" | "Receptionist" | "Ambulance"
├── isBlocked         Boolean  default: false
├── services          [{ serviceId → Service, reservedAt }]
├── location          GeoJSON  { type: "Point", coordinates: [lng, lat] }
│                              (2dsphere index)
│
│── ── Patient-specific fields ──
├── currentCondition  String   Allergies / symptoms
├── admissionDate     Date
├── medicalHistory    String
├── assignedDoctor    ObjectId → User
├── medicineSchedule  String
├── totalFees         Number   default: 0
├── feesPaid          Boolean  default: false
├── reservedICU       ObjectId → ICURoom
├── patientStatus     String   "RESERVED" | "AWAITING_PICKUP" | "IN_TRANSIT" |
│                              "ARRIVED" | "CHECKED_IN" | "CHECKED_OUT"
├── assignedAmbulance ObjectId → User (Ambulance)
├── pickupLocation    String
├── needsPickup       Boolean
│
│── ── Admin-specific fields ──
├── hospitalId        [ObjectId → Hospital]
│
│── ── Manager-specific fields ──
├── assignedDepartments  [ObjectId]
├── assignedEmployees    [ObjectId → User]
├── assignedManager      ObjectId → User (self-ref)
│
│── ── Doctor-specific fields ──
├── doctorDepartment  String
├── patients          [ObjectId → User]
│
│── ── Receptionist-specific fields ──
├── assignedHospital  ObjectId → Hospital
│
│── ── Ambulance-specific fields ──
├── status            String   "AVAILABLE" | "EN_ROUTE" | "ARRIVED_HOSPITAL"
├── currentLocation   GeoJSON  { type: "Point", coordinates: [lng, lat] }
├── eta               Number   (minutes)
├── assignedPatient   ObjectId → User (Patient)
├── destination       String
└── timestamps        createdAt, updatedAt
```

### 4.3 Hospital Model

```
hospitals
├── name              String   Required
├── address           String   Required
├── email             String   Unique, email-validated
├── location          GeoJSON  { type: "Point", coordinates: [lng, lat] }
│                              (2dsphere index)
├── contactNumber     String   Required
├── status            String   "Active" | "Blocked"
├── assignedManager   ObjectId → User (Manager)
└── timestamps        createdAt, updatedAt
```

### 4.4 ICU Room Model

```
iCUrooms
├── hospital          ObjectId → Hospital  Required
├── specialization    String   Enum of 16 ICU types:
│                              Medical ICU, Surgical ICU, Cardiac ICU,
│                              Neonatal ICU, Pediatric ICU, Neurological ICU,
│                              Trauma ICU, Burn ICU, Respiratory ICU,
│                              Coronary Care Unit, Oncology ICU, Transplant ICU,
│                              Geriatric ICU, Post-Anesthesia Care Unit,
│                              Obstetric ICU, Infectious Disease ICU
├── room              String   Room identifier (e.g. "101", "A-12")
├── capacity          Number   Min: 1, default: 1
├── status            String   "Occupied" | "Available" | "Maintenance"
├── fees              Number   Daily rate
├── isReserved        Boolean  default: false
├── reservedBy        ObjectId → User (Patient)
├── checkedInAt       Date
└── timestamps        createdAt, updatedAt
```

### 4.5 Ambulance Request Model

```
ambulancerequests
├── patient           ObjectId → User  Required
├── hospital          ObjectId → Hospital  Required
├── icu               ObjectId → ICURoom  Optional
├── pickupLocation    String   Human-readable address
├── pickupCoordinates GeoJSON  { type: "Point", coordinates: [lng, lat] }
│                              (2dsphere index)
├── status            String   "pending" | "accepted" | "in_transit" |
│                              "arrived" | "completed" | "cancelled"
├── acceptedBy        ObjectId → User (Ambulance)
├── acceptedAt        Date
├── patientPhone      String
├── urgency           String   "normal" | "urgent" | "critical"
├── notes             String
└── timestamps        createdAt, updatedAt

Indexes:
  - { pickupCoordinates: '2dsphere' }
  - { status: 1, createdAt: -1 }
```

### 4.6 Service Model

```
services
├── name              String   Required
├── fee               Number   Required
├── category          String   "ICU" | "Visitor Room" | "Kids Area" | "General"
├── description       String
├── reservedBy        ObjectId → User (optional)
└── timestamps        createdAt, updatedAt
```

### 4.7 Feedback Model

```
feedbacks
├── hospital          ObjectId → Hospital  Required
├── user              ObjectId → User  Required
├── rating            Number   0–5
├── comment           String
└── timestamps        createdAt, updatedAt
```

### 4.8 Entity Relationship Diagram

```
Hospital ──< ICURoom
Hospital ──< Service
Hospital ──< Feedback
Hospital ──1  User (Manager, assignedManager)

User(Patient) ──1  ICURoom (reservedICU)
User(Patient) ──1  User (Ambulance, assignedAmbulance)
User(Patient) ──1  User (Doctor, assignedDoctor)
User(Patient) ──< services[]

AmbulanceRequest ──1  User (Patient)
AmbulanceRequest ──1  Hospital
AmbulanceRequest ──1  ICURoom (optional)
AmbulanceRequest ──1  User (Ambulance, acceptedBy)

User(Manager) ──< User (assignedEmployees)
User(Admin)   ──< Hospital (hospitalId)
```

---

## 5. API Endpoints

All protected routes require a valid JWT token sent as an HTTP-only cookie named `token` (or `Authorization: Bearer <token>` header).

### 5.1 User / Authentication — `/user`

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/user/create-user` | ❌ | — | Register a new patient account |
| POST | `/user/login-user` | ❌ | — | Authenticate user; sets JWT cookie |
| POST | `/user/verify-token` | ❌ | — | Validate a JWT token |
| PUT | `/user/:userId/update-medical-details` | ❌ | — | Update patient medical details |
| GET | `/user/details/:userId` | ❌ | — | Get user profile details |
| POST | `/user/send-email` | ❌ | — | Send email notification |
| GET | `/user/live-locations` | ✅ | Admin, Manager, Receptionist, Ambulance | Poll live GPS coordinates of all ambulances |

### 5.2 Admin — `/admin`

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/admin/add-hospital` | ✅ | Admin | Create a new hospital |
| GET | `/admin/view-hospitals` | ✅ | Admin | List all hospitals |
| DELETE | `/admin/delete-hospital/:id` | ✅ | Admin | Remove a hospital |
| PUT | `/admin/block-hospital/:id` | ✅ | Admin | Block a hospital |
| PUT | `/admin/unblock-hospital/:id` | ✅ | Admin | Unblock a hospital |
| POST | `/admin/assign-manager` | ✅ | Admin | Assign a manager to a hospital |
| POST | `/admin/create-manager-account` | ✅ | Admin | Create a manager user account |
| POST | `/admin/create-admin-account` | ✅ | Admin | Create an admin user account |
| POST | `/admin/create-user` | ✅ | Admin | Create any user account |
| GET | `/admin/view-all-admins` | ✅ | Admin | List all admin accounts |
| GET | `/admin/view-all-managers` | ✅ | Admin | List all manager accounts |
| PUT | `/admin/update-user/:id` | ✅ | Admin | Update any user record |
| DELETE | `/admin/delete-user/:id` | ✅ | Admin | Delete a user account |
| PUT | `/admin/block-user/:id` | ✅ | Admin | Block a user |
| PUT | `/admin/unblock-user/:id` | ✅ | Admin | Unblock a user |
| GET | `/admin/search-manager-with-hospitals` | ✅ | Admin | Search managers with their hospitals |
| GET | `/admin/search-hospital-with-feedbacks/:hospitalId` | ✅ | Admin | Hospital with all feedbacks |
| GET | `/admin/view-an-managers/:id` | ✅ | Admin | View a specific manager |
| GET | `/admin/view-hospitals-rating` | ✅ | Admin | All hospitals with average ratings |

### 5.3 Manager — `/manager`

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/manager/my-hospital` | ✅ | Manager | Get manager's assigned hospital |
| POST | `/manager/register-icu` | ✅ | Manager | Add a new ICU room |
| GET | `/manager/view-icus` | ✅ | Manager | List all ICU rooms in hospital |
| GET | `/manager/view-icu-byid/:icuId` | ✅ | Manager | Get ICU room details |
| PUT | `/manager/update-icu/:icuId` | ✅ | Manager | Update ICU room details |
| DELETE | `/manager/delete-icu/:icuId` | ✅ | Manager | Remove an ICU room |
| POST | `/manager/create-receptionist` | ✅ | Manager | Create a receptionist account |
| GET | `/manager/receptionists` | ✅ | Manager | List all receptionists |
| GET | `/manager/receptionist/:receptionistId` | ✅ | Manager | Get specific receptionist |
| PUT | `/manager/receptionist/:receptionistId` | ✅ | Manager | Update receptionist |
| DELETE | `/manager/receptionist/:receptionistId` | ✅ | Manager | Delete receptionist |

### 5.4 Patient — `/patient`

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/patient/get-available-icus` | ❌ | — | Browse available ICU beds (public) |
| PUT | `/patient/medical-history` | ✅ | Patient | Update medical history |
| POST | `/patient/rate-hospital` | ✅ | Patient | Submit hospital rating and feedback |
| GET | `/patient/hospital-rating/:hospitalId` | ✅ | Patient | View a hospital's rating |
| GET | `/patient/total-fees/:userId` | ✅ | Patient | Get total accumulated fees |
| POST | `/patient/reserve-icu` | ✅ | Patient | Reserve an ICU bed |
| POST | `/patient/free-icu` | ✅ | Patient | Release an ICU reservation |
| GET | `/patient/reserved-services/:userId` | ✅ | Patient | List reserved services |

### 5.5 Ambulance — `/ambulance`

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/ambulance/request` | ✅ | Patient | Create a new ambulance pickup request |
| GET | `/ambulance/requests` | ✅ | Ambulance | View all active requests (sorted by distance) |
| POST | `/ambulance/requests/:requestId/accept` | ✅ | Ambulance | Accept a specific pickup request |
| DELETE | `/ambulance/requests/:requestId/cancel` | ✅ | Patient | Cancel an active request |
| GET | `/ambulance/my-request` | ✅ | Patient | Get the patient's active request |
| GET | `/ambulance/my-accepted-request` | ✅ | Ambulance | Get the ambulance's current accepted request |
| GET | `/ambulance/` | ✅ | Admin, Manager, Receptionist, Ambulance | List all active ambulances |
| GET | `/ambulance/:ambulanceId` | ✅ | Admin, Manager, Ambulance | Get ambulance details |
| PUT | `/ambulance/:ambulanceId/status` | ✅ | Ambulance | Update ambulance operational status |
| POST | `/ambulance/:ambulanceId/assign` | ✅ | Admin, Receptionist | Assign ambulance to patient |
| POST | `/ambulance/:ambulanceId/approve-pickup` | ✅ | Ambulance | Approve pickup request |
| POST | `/ambulance/:ambulanceId/reject-pickup` | ✅ | Ambulance | Reject pickup request |
| POST | `/ambulance/:ambulanceId/accept-pickup` | ✅ | Ambulance | Confirm ambulance en route to patient |
| POST | `/ambulance/:ambulanceId/mark-arrived` | ✅ | Ambulance | Mark patient as arrived at hospital |
| POST | `/ambulance/:ambulanceId/notify-waiting` | ✅ | Ambulance | Notify patient that ambulance is waiting |

### 5.6 Receptionist — `/receptionist`

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/receptionist/icu-requests` | ✅ | Admin, Manager, Receptionist | List pending ICU reservations |
| GET | `/receptionist/checked-in-patients` | ✅ | Admin, Manager, Receptionist | List currently checked-in patients |
| POST | `/receptionist/approve-request` | ✅ | Admin, Manager, Receptionist | Approve ICU request; dispatch ambulance if needed |
| POST | `/receptionist/reserve-icu` | ✅ | Admin, Manager, Receptionist | Reserve ICU for a patient |
| POST | `/receptionist/check-in` | ✅ | Admin, Manager, Receptionist | Check a patient into their ICU bed |
| POST | `/receptionist/check-out` | ✅ | Admin, Manager, Receptionist | Discharge a patient from the ICU |
| GET | `/receptionist/calculate-fee` | ✅ | Admin, Manager, Receptionist | Calculate patient total fees |
| POST | `/receptionist/mark-fees-paid` | ✅ | Admin, Manager, Receptionist | Mark patient fees as settled |

### 5.7 ICU — `/icu`

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/icu/available` | ❌ | — | List available ICU rooms (public) |
| GET | `/icu/all` | ✅ | Admin, Manager, Receptionist | List all ICU rooms |
| GET | `/icu/:id` | ✅ | Admin, Manager, Receptionist, Patient | Get ICU room by ID |
| POST | `/icu/reserve` | ✅ | Admin, Manager, Receptionist, Patient | Reserve an ICU room |
| POST | `/icu/cancel` | ✅ | Admin, Manager, Receptionist, Patient | Cancel an ICU reservation |

### 5.8 Hospital — `/hospital`

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/hospital/nearby` | ❌ | — | Get nearby hospitals by location (public) |
| POST | `/hospital/add-hospital` | ✅ | Admin | Add a hospital |
| GET | `/hospital/view-hospitals` | ✅ | Admin, Manager | List all hospitals |
| PUT | `/hospital/block-hospital/:id` | ✅ | Admin | Block a hospital |
| PUT | `/hospital/unblock-hospital/:id` | ✅ | Admin | Unblock a hospital |
| PUT | `/hospital/assign-manager/:id` | ✅ | Admin | Assign a manager to a hospital |
| DELETE | `/hospital/delete-hospital/:id` | ✅ | Admin | Delete a hospital |

### 5.9 Meta — `/meta`

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/meta/icu-specializations` | ❌ | — | List all valid ICU specialization strings |
| GET | `/meta/service-categories` | ❌ | — | List all valid service categories |

### 5.10 Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | ❌ | Returns server uptime, DB connection status, environment |

**Sample health response:**
```json
{
  "uptime": 3600.5,
  "message": "OK",
  "timestamp": 1741740000000,
  "environment": "production",
  "database": "connected"
}
```

---

## 6. Real-Time Communication (Socket.IO)

CareSync uses Socket.IO 4.8 on the same HTTP server as the REST API (port 3030). The frontend establishes a persistent WebSocket connection after login.

### 6.1 Server-Side Events

| Event (emit) | Direction | Payload | Description |
|---|---|---|---|
| `Data` | Server → Client | `"Welcome to the server!"` | Sent to each client on initial connection |
| `hospitalAdded` | Server → All Clients | Hospital object | Broadcast when a new hospital is added |

### 6.2 Client-Side Events (listened by server)

| Event (on) | Direction | Payload | Description |
|---|---|---|---|
| `hospitalAdded` | Client → Server | New hospital data | Triggers broadcast to all connected clients |
| `disconnect` | Client → Server | — | Logged on socket disconnection |

### 6.3 Frontend Real-Time Utilities

The frontend includes dedicated Socket.IO utility files (`src/utils/`) that manage:
- Connection lifecycle (connect, disconnect, reconnect)
- Ambulance status updates streamed to the patient
- ICU availability updates pushed to receptionist dashboards
- Real-time notifications for request acceptance/rejection

### 6.4 Socket.IO Configuration

```javascript
// Server-side CORS mirrors REST API allowedOrigins
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  pingTimeout: 120000,      // 2-minute ping timeout
  maxHttpBufferSize: 1e8,   // 100 MB max message size
});
```

---

## 7. Deployment Architecture

### 7.1 Container Architecture

CareSync runs as three Docker containers orchestrated by Docker Compose:

```
┌────────────────────────────────────────────────────┐
│              devopsians-net (Docker bridge)         │
│                                                    │
│  ┌─────────────────┐   ┌──────────────────────┐   │
│  │ frontend        │   │ backend              │   │
│  │ React + Nginx   │   │ Node.js + Express    │   │
│  │ :80 / :443      │◄──│ :3030                │   │
│  └─────────────────┘   └──────────┬───────────┘   │
│                                   │               │
│                         ┌─────────▼──────────┐   │
│                         │ mongodb            │   │
│                         │ MongoDB 7          │   │
│                         │ :27017             │   │
│                         └────────────────────┘   │
└────────────────────────────────────────────────────┘
```

All services include Docker health checks and `restart: unless-stopped` policies.

### 7.2 Nginx Reverse Proxy

The production Nginx configuration (`Deploy/nginx/nginx.conf`) provides:

- **Rate limiting:** 10 requests/second for API endpoints, 50 requests/second general
- **WebSocket upgrade:** Proper `Upgrade`/`Connection` header forwarding for Socket.IO
- **Security headers:** `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`
- **Gzip compression:** For JSON, CSS, JavaScript, and XML responses
- **Cookie passthrough:** `Cookie` and `Set-Cookie` headers forwarded for JWT authentication
- **Health check endpoint:** `/health` returns `200 healthy` without logging

Key proxy configuration:
```nginx
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://backend/;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Cookie $http_cookie;
    proxy_pass_header Set-Cookie;
}
```

### 7.3 Deployment Environments

| Environment | Compose File | Database | Description |
|---|---|---|---|
| Local Dev | `docker-compose.local.yml` | Local MongoDB container | Developer workstation |
| Staging | `docker-compose.yml` | Local MongoDB container | Pre-production testing |
| Production | `docker-compose.production.yml` | Local MongoDB container | Live environment |
| Atlas | `docker-compose.atlas.yml` | MongoDB Atlas (cloud) | Managed cloud DB |

### 7.4 CI/CD Pipeline (GitHub Actions)

```
Push to main
     │
     ▼
┌──────────┐
│  1. TEST │  echo "Tests pending" (placeholder stage)
└────┬─────┘
     │
     ▼
┌─────────────────┐
│ 2. BUILD FRONT  │  npm install + vite build + Docker build/push
└────────┬────────┘
     │
     ▼
┌─────────────────┐
│ 3. BUILD BACK   │  Docker build/push backend image
└────────┬────────┘
     │
     ▼
┌───────────────────┐
│ 4. TERRAFORM PLAN │  terraform init + plan
└──────────┬────────┘
     │
     ▼
┌────────────────────┐
│ 5. DEPLOY (EKS)    │  AWS EKS kubectl apply
└────────────────────┘
```

**Pipeline secrets required:**

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub account |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `AWS_ACCESS_KEY_ID` | AWS IAM key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret |
| `JWT_SECRET_KEY` | Application JWT signing secret |
| `MONGO_URL` | MongoDB connection string |
| `FRONTEND_URL` | Deployed frontend URL |

### 7.5 AWS Infrastructure

- **Region:** `us-east-1`
- **Compute:** EC2 instances or EKS cluster (`devopsians-eks-cluster`)
- **Static IP:** `34.228.5.183` (Elastic IP)
- **Networking:** VPC with public/private subnets, security groups
- **IaC:** Terraform scripts in `/terraform`
- **Kubernetes:** Manifests in `/k8s` for pod deployments, services, ingress

### 7.6 Environment Variables

**Backend (`.env`):**

```env
NODE_ENV=production
PORT=3030
MONGO_URL=mongodb://user:pass@host:27017/caresync
JWT_SECRET_KEY=<strong-secret>
JWT_EXPIRES=1d
FRONTEND_URL=https://caresync.example.com
EMAIL_USER=noreply@caresync.example.com
EMAIL_PASS=<smtp-password>
CORS_ALLOW_ALL=false
LOG_LEVEL=info
```

**Frontend (`.env`):**

```env
VITE_API_URL=https://api.caresync.example.com
VITE_SOCKET_URL=https://api.caresync.example.com
```

---

## 8. Security Considerations

### 8.1 Authentication & Authorization

| Mechanism | Implementation | Details |
|---|---|---|
| Authentication | JWT (JSON Web Tokens) | 1-day expiration, HTTP-only cookies |
| Authorization | Role-Based Access Control (RBAC) | `isAuthenticated` + `authorizeRoles()` middleware on every protected route |
| Password Hashing | bcryptjs | Passwords never stored in plain text; `select: false` on schema |
| Token Validation | `authMiddleware.js` | Verifies signature, expiry, and blocked status on every request |

### 8.2 Input Validation & Sanitization

| Layer | Mechanism | Purpose |
|---|---|---|
| MongoDB injection | `express-mongo-sanitize` | Strips `$` operators from request body/params |
| XSS | Custom `sanitizeRequest` middleware | Sanitizes all string inputs before processing |
| HTTP Parameter Pollution | `hpp` | Prevents duplicate query parameters from being exploited |
| Email validation | Mongoose + `validator` | Validates email format at schema level |
| File uploads | `express-fileupload` with 5 MB limit | Prevents oversized file attacks; `abortOnLimit: true` |
| Body size | Express JSON/urlencoded 100 MB limit | Prevents excessively large payload attacks |

### 8.3 Rate Limiting

| Limiter | Window | Limit | Applied To |
|---|---|---|---|
| General | 1 hour | 1000 requests (100 dev) | All routes |
| Auth | 15 minutes | 10 attempts (100 dev) | `/user/login`, `/user/register`, `/admin/login` |
| Nginx API | 1 second | 10 rps (burst 20) | All `/api/` routes at proxy level |
| Nginx General | 1 second | 50 rps | All other routes |

### 8.4 HTTP Security Headers (Helmet)

```
Content-Security-Policy:
  default-src 'self';
  style-src 'self' 'unsafe-inline';
  script-src 'self';
  img-src 'self' data: https:

X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer-when-downgrade
```

### 8.5 CORS Policy

- Allowed origins configured via `FRONTEND_URL` environment variable
- Developer overrides available via `CORS_ALLOW_ALL=true` (must never be set in production)
- Credentials: `true` (required for cookie-based JWT)

### 8.6 Data Security

| Area | Control |
|---|---|
| Passwords | bcryptjs hashed; excluded from all query results (`select: false`) |
| User blocking | `isBlocked` checked at auth middleware; blocked users cannot authenticate |
| Geolocation | Coordinates stored as GeoJSON; precise location only accessible to authorized roles |
| Medical data | Patient medical history, conditions, and medicine schedule accessible only to the patient and authorized staff |

### 8.7 Security Checklist

- [x] JWT tokens expire after 1 day
- [x] HTTP-only cookies for token storage (prevents XSS token theft)
- [x] Helmet security headers enabled
- [x] Rate limiting on auth and general endpoints
- [x] NoSQL injection prevention
- [x] HTTP Parameter Pollution prevention
- [x] CORS restricted to known origins in production
- [x] Password hashing with bcrypt
- [x] File upload size limits enforced
- [x] Input sanitization on all incoming requests
- [x] Role-based access control on all sensitive endpoints
- [x] Blocked users rejected at the auth middleware layer
- [ ] HTTPS/TLS termination (to be handled at the Nginx/load balancer level in production)
- [ ] MongoDB authentication enabled in production (set via `MONGO_URL`)
- [ ] Secrets managed via AWS Secrets Manager or equivalent (not hardcoded)

---

## 9. Future Scalability

### 9.1 Horizontal Scaling

The stateless backend design (JWT cookies, no server-side session storage) enables horizontal scaling with multiple API server instances. Adding a Socket.IO adapter (e.g., `@socket.io/redis-adapter`) would allow real-time events to propagate across all instances.

**Recommended path:**
```
Current:  Single Node.js process
Next:     Multiple Node.js replicas behind Nginx upstream
Future:   Kubernetes HPA (Horizontal Pod Autoscaler) on CPU/memory metrics
```

### 9.2 Database Scaling

| Strategy | Description |
|---|---|
| MongoDB Atlas | Managed cloud scaling with auto-sharding and replica sets |
| Read replicas | Offload read-heavy queries (ICU availability, patient lists) |
| Caching (Redis) | Cache frequently read, rarely changing data (hospital lists, ICU specializations) |
| Sharding | Partition `ambulancerequests` by hospital region for geographic scaling |

### 9.3 Real-Time Scalability

Current Socket.IO setup is single-process. For multi-node deployments:
- Introduce `@socket.io/redis-adapter` with Redis Pub/Sub
- Consider dedicated WebSocket services (e.g., Ably, Pusher) for very high concurrency
- Implement Socket.IO rooms per hospital to limit broadcast scope

### 9.4 Feature Roadmap Candidates

| Feature | Description |
|---|---|
| Push notifications | Mobile push for ambulance arrival alerts (FCM/APNs) |
| Video consultation | WebRTC-based doctor–patient video calls |
| EHR integration | HL7/FHIR APIs for interoperability with external health record systems |
| Predictive ICU demand | ML model to forecast ICU capacity needs by hour/day |
| Multi-hospital patient routing | Automated routing of patients to nearest hospital with matching ICU availability |
| Audit logging | Immutable audit trail for all clinical data changes |
| Multi-language support | i18n for Arabic, French, and other regional languages |
| Mobile applications | React Native clients for ambulance crews and patients |

### 9.5 Observability

| Component | Recommended Tool |
|---|---|
| Metrics | Prometheus + Grafana (dashboards in `/Deploy/monitoring`) |
| Logging | ELK Stack (Elasticsearch + Logstash + Kibana) or AWS CloudWatch |
| Tracing | OpenTelemetry + Jaeger |
| Uptime monitoring | AWS CloudWatch Alarms or Datadog |
| Alerting | PagerDuty / OpsGenie for on-call escalation |

### 9.6 Infrastructure Maturity Path

```
Phase 1 (Current):  Docker Compose on EC2
Phase 2 (Next):     EKS with auto-scaling node groups (Terraform in /terraform)
Phase 3 (Future):   Multi-region active-active deployment with global traffic manager
```

---

*This document is maintained by the CareSync engineering team. For questions or corrections, open an issue in the repository.*
