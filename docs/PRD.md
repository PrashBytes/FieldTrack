# FieldTrack — Product Requirements Document

## Overview

FieldTrack is a secure, privacy-first field workforce management platform that combines employee attendance tracking with GPS location validation. It is designed for companies employing field surveyors, sales representatives, service technicians, and other mobile workers.

## Target Users

- **Company Administrators**: Manage employees, configure geofences, review fraud alerts, export reports
- **Managers**: View team attendance, approve corrections, monitor live tracking
- **Employees**: Check in/out, view their own attendance history, understand privacy boundaries

## Core Features

### 1. Employee Management
- Add, edit, deactivate employees with unique codes per organization
- Assign departments, teams, managers, and shifts
- Device registration and revocation

### 2. Secure Authentication
- Supabase Auth with email/password
- Role-based access control (super_admin, company_admin, manager, employee)
- Multi-tenant organization isolation

### 3. Attendance Tracking
- Server-controlled check-in/check-out with transactional integrity
- Prevents duplicate sessions (one active session per employee)
- Geofence-based attendance validation
- Attendance correction workflow with audit trail

### 4. GPS Tracking
- Native Android foreground service for continuous tracking
- Fused Location Provider with configurable sampling intervals
- Offline-first with Room database and WorkManager sync
- Idempotent batch location ingestion

### 5. Anti-Spoofing
- Mock location signal detection (Location.isMock())
- Google Play Integrity API integration
- Device binding and revocation
- Server-side movement plausibility analysis
- Location quality assessment
- Trust status: TRUSTED, REVIEW_REQUIRED, HIGH_RISK, UNVERIFIED

### 6. Admin Dashboard
- Live tracking map with employee positions
- Route history with chronological replay
- Geofence management with visual map
- Fraud event review workflow
- Attendance dashboard with real-time stats
- Audit logs for all sensitive actions
- CSV report export

### 7. Privacy
- Tracking only during authorized work sessions
- Clear employee notification when tracking is active
- Configurable data retention
- No covert monitoring
- Privacy contact configurable per organization

## Non-Goals

- This is not a covert surveillance tool
- Does not track outside authorized work sessions
- Does not record audio or personal data
- Does not automatically penalize employees for unverified GPS anomalies

## Success Criteria

- 20-50 employee pilot with reliable attendance and tracking
- Sub-5-second location ingestion latency
- Offline queue preserves all collected data
- Fraud detection produces reviewable evidence, not automatic penalties
