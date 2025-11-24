# Deployment Architecture

## Current Architecture (Development)

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host (Local)                       │
│                                                              │
│  ┌─────────────┐      ┌──────────────┐      ┌────────────┐ │
│  │  Frontend   │      │   Backend    │      │  MongoDB   │ │
│  │  (Port 3000)│◄────►│  (Port 3030) │◄────►│(Port 27018)│ │
│  │             │      │              │      │            │ │
│  └─────────────┘      └──────────────┘      └────────────┘ │
│         ▲                     ▲                             │
│         │                     │                             │
└─────────┼─────────────────────┼─────────────────────────────┘
          │                     │
          │                     │
    ┌─────┴──────┐       ┌─────┴──────┐
    │   User     │       │  API Call  │
    │  Browser   │       │            │
    └────────────┘       └────────────┘
```

## Enhanced Production Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Docker Host (Production)                      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Nginx Reverse Proxy                          │ │
│  │         (Port 80/443, Rate Limiting, SSL, Caching)              │ │
│  └───────────┬─────────────────────────────┬──────────────────────┘ │
│              │                              │                         │
│              │                              │                         │
│  ┌───────────▼──────────┐      ┌───────────▼──────────┐             │
│  │     Frontend         │      │      Backend         │             │
│  │   (Internal: 80)     │      │   (Internal: 3030)   │             │
│  │   - React/Vite       │      │   - Express API      │             │
│  │   - Nginx Server     │      │   - Socket.io        │             │
│  │   - Static Assets    │      │   - Health Check     │             │
│  └──────────────────────┘      └──────────┬───────────┘             │
│                                            │                          │
│                                            │                          │
│                                 ┌──────────▼───────────┐             │
│                                 │      MongoDB         │             │
│                                 │  (Internal: 27017)   │             │
│                                 │  - Data Persistence  │             │
│                                 │  - Auto Backups      │             │
│                                 └──────────────────────┘             │
│                                                                       │
│  ┌─────────────────────── Monitoring Stack ─────────────────────┐   │
│  │                                                                │   │
│  │  ┌─────────────┐         ┌──────────────┐                    │   │
│  │  │ Prometheus  │◄────────│   Grafana    │                    │   │
│  │  │(Port 9090)  │         │ (Port 3100)  │                    │   │
│  │  │             │         │              │                    │   │
│  │  └─────────────┘         └──────────────┘                    │   │
│  │         ▲                                                      │   │
│  │         └──────────── Scrapes Metrics ────────────────┐       │   │
│  └────────────────────────────────────────────────────────┼───────┘   │
│                                                            │           │
└────────────────────────────────────────────────────────────┼───────────┘
                                                             │
                ┌────────────────────────────────────────────┘
                │
        ┌───────▼────────┐
        │  External User │
        │  (HTTPS/80)    │
        └────────────────┘
```

## Network Flow

### Development
```
User → Frontend:3000 → Backend:3030 → MongoDB:27018
```

### Production
```
User → Nginx:80/443 → Frontend:internal → Backend:internal → MongoDB:internal
                   ↓
             Rate Limiting
             SSL Termination
             Security Headers
             Static Caching
```

## Data Flow

```
┌──────────────┐
│    Client    │
└──────┬───────┘
       │ HTTP/HTTPS Request
       │
       ▼
┌──────────────┐
│    Nginx     │ ← Rate Limiting
│  (Gateway)   │ ← Security Headers
└──────┬───────┘ ← SSL Termination
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌──────────────┐  ┌─────────────┐
│   Frontend   │  │   Backend   │
│   (Static)   │  │    (API)    │
└──────────────┘  └──────┬──────┘
                         │
                         ▼
                  ┌─────────────┐
                  │   MongoDB   │
                  │  (Database) │
                  └─────────────┘
```

## CI/CD Pipeline Flow

```
┌─────────────┐
│   Git Push  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   GitHub    │
│   Actions   │
└──────┬──────┘
       │
       ├─────► Run Tests
       │
       ├─────► Build Images
       │
       ├─────► Push to DockerHub
       │
       ▼
┌─────────────┐
│  DockerHub  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Deploy    │
│   Server    │
└─────────────┘
```

## Backup Strategy

```
┌──────────────┐
│   MongoDB    │
└──────┬───────┘
       │
       │ Daily Backup (Cron)
       │
       ▼
┌──────────────┐
│    Local     │
│   Backup     │
│   Storage    │
└──────┬───────┘
       │
       │ (Optional)
       │
       ▼
┌──────────────┐
│    Cloud     │
│   Storage    │
│  (S3/GCS)    │
└──────────────┘

Retention: 7 days local
          30+ days cloud
```

## Security Layers

```
Layer 1: Network Firewall
         ↓
Layer 2: Rate Limiting (Nginx)
         ↓
Layer 3: Authentication (JWT)
         ↓
Layer 4: Authorization (Role-based)
         ↓
Layer 5: Database Access Control
```

## Monitoring Data Flow

```
┌──────────────┐
│   Services   │
└──────┬───────┘
       │ Expose Metrics
       │
       ▼
┌──────────────┐
│  Prometheus  │ ← Scrapes every 15s
└──────┬───────┘
       │
       │ Query Data
       │
       ▼
┌──────────────┐
│   Grafana    │ ← Visualization
└──────┬───────┘
       │
       ▼
┌──────────────┐
│     User     │ ← Dashboard View
└──────────────┘
```

## Deployment Strategies

### 1. Rolling Update (Current)
```
Old Version → Stop → New Version → Start
```

### 2. Blue-Green (Recommended)
```
Blue (Current)  ────►  Live Traffic
Green (New)     ────►  Testing

Switch:
Green (New)     ────►  Live Traffic
Blue (Old)      ────►  Standby/Remove
```

### 3. Canary (Advanced)
```
v1.0 ────► 90% traffic
v2.0 ────► 10% traffic

If OK:
v2.0 ────► 100% traffic
v1.0 ────► Remove
```

## Resource Allocation

```
Service      CPU      Memory    Priority
─────────────────────────────────────────
MongoDB      2 cores  2GB       High
Backend      1 core   1GB       High
Frontend     0.5 core 512MB     Medium
Nginx        0.5 core 256MB     High
Prometheus   0.5 core 512MB     Low
Grafana      0.5 core 512MB     Low
```

## Port Mapping

### Development
```
Service      Internal    External    Access
────────────────────────────────────────────
Frontend     80          3000        Public
Backend      3030        3030        Public
MongoDB      27017       27018       Public
```

### Production
```
Service      Internal    External    Access
────────────────────────────────────────────
Nginx        80/443      80/443      Public
Frontend     80          -           Internal
Backend      3030        -           Internal
MongoDB      27017       -           Internal
Prometheus   9090        9090        Localhost
Grafana      3000        3100        Localhost
```
