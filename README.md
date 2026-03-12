CareSync

CareSync is a real-time healthcare coordination platform designed to streamline ICU reservation, emergency transport, and hospital intake workflows.

The system connects patients, ambulance crews, hospital receptionists, managers, and administrators through a structured workflow with real-time updates, improving visibility and response time during critical care situations.

⸻

Overview

CareSync unifies ICU reservation requests and emergency coordination into a single operational workflow.

Hospitals and emergency teams can track requests from initial intake to final admission, ensuring faster decisions and better coordination between departments.

The platform enables:
	•	Real-time ICU reservation tracking
	•	Ambulance dispatch coordination
	•	Hospital intake and patient management
	•	Role-based operational control
	•	Live system updates across all participants

⸻

Problem

In many hospital networks, ICU reservations and emergency coordination happen through fragmented channels such as:
	•	phone calls
	•	manual coordination
	•	disconnected systems

This results in:
	•	slow approval cycles
	•	unclear reservation status
	•	inefficient ambulance-to-hospital handoffs
	•	limited operational visibility

⸻

Solution

CareSync provides a workflow-first platform where ICU reservation requests move through a structured lifecycle:

Request → Review → Approval → Status

Each stage is visible to the relevant stakeholders, and real-time updates ensure all actors stay synchronized.

The system integrates patient requests, ambulance operations, and hospital intake into a single operational platform.

⸻

Impact

CareSync improves healthcare coordination by:
	•	Delivering a full ICU reservation lifecycle with clear ownership at each stage
	•	Enabling real-time status propagation across patients, hospitals, and ambulance crews
	•	Reducing manual coordination between emergency responders and hospitals
	•	Providing a production-ready cloud deployment architecture

⸻

Key Features

Structured ICU Reservation Workflow

Clear request lifecycle from patient submission to hospital approval.

Real-Time Status Updates

Live synchronization using Socket.IO for request status changes.

Multi-Role Access System

Different workflows and permissions for:
	•	Patients
	•	Ambulance crews
	•	Receptionists
	•	Hospital managers
	•	System administrators

Operational Dashboard

Responsive dashboard for managing reservations and monitoring activity.

Cloud-Ready Architecture

Containerized services with infrastructure designed for reliable deployment.

⸻

User Roles

Patient
	•	Search hospitals with available ICU capacity
	•	Reserve ICU beds
	•	Request ambulance pickup
	•	Track request status
	•	Rate hospital services

Ambulance Crew
	•	View open pickup requests
	•	Accept transport jobs
	•	Track route and trip status
	•	Mark pickup and hospital arrival

Receptionist
	•	Manage ICU reservations for assigned hospital
	•	Check patients in and out
	•	Process payments and administrative tasks

Manager
	•	Manage hospital ICUs and staff
	•	Oversee hospital operational activity

Admin
	•	Manage hospitals, users, and system-wide operations

⸻

End-to-End Workflow
	1.	Patient searches for hospitals with available ICU beds
	2.	Patient reserves an ICU bed
	3.	Patient optionally requests ambulance pickup
	4.	Ambulance crew accepts the transport request
	5.	Receptionist receives the case and prepares admission
	6.	Patient arrives and is checked in
	7.	System updates all actors in real time

⸻

Tech Stack

Backend
	•	Node.js
	•	Express.js
	•	MongoDB
	•	Mongoose
	•	Socket.IO
	•	JWT Authentication

Frontend
	•	React
	•	Vite
	•	React Router
	•	Socket.IO Client

Infrastructure
	•	Docker
	•	Nginx
	•	Docker Compose
	•	Jenkins CI/CD
	•	AWS EC2

⸻

Repository Structure

backend/      Express API, models, routes, utilities
frontend/     React UI application
Deploy/       Production Docker Compose configuration and pipelines
docs/         System documentation and architecture planning


⸻

Local Development

Prerequisites
	•	Node.js 20
	•	MongoDB (local or Atlas)

⸻

Backend

Create .env in backend/:

MONGO_URL=<your MongoDB connection string>
PORT=3030
FRONTEND_URL=http://localhost:5173
JWT_SECRET=<secret>
JWT_EXPIRE=1d
COOKIE_EXPIRE=1

Run backend:

cd backend
npm install
npm run dev

Backend will run on:

http://localhost:3030


⸻

Frontend

Create optional .env.local:

VITE_API_URL=http://localhost:3030

Run frontend:

cd frontend
npm install
npm run dev

Frontend runs on:

http://localhost:5173


⸻

Docker Deployment

Build images:

docker build -t caresync-backend -f backend/Dockerfile .
docker build -t caresync-frontend -f frontend/Dockerfile .

Run containers:

docker run -d -p 3030:3030 caresync-backend
docker run -d -p 80:80 caresync-frontend

Frontend:

http://localhost

Backend API:

http://localhost:3030


⸻

CI/CD

The project includes automated CI/CD pipelines that:
	•	build Docker images
	•	push them to Docker Hub
	•	deploy the stack to an EC2 instance
	•	run health checks after deployment

CI/CD tools used:
	•	GitHub Actions
	•	Jenkins
	•	Docker Hub
	•	AWS EC2

⸻

Project Type

CareSync is a hospital operations and emergency coordination platform designed primarily for:
	•	hospital networks
	•	emergency coordination centers
	•	healthcare operators

The platform follows a B2B / B2B2C model, where hospitals operate the system while patients interact with it through the reservation workflow.
