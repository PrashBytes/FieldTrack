# FieldTrack — Testing

## Test Strategy

### Web Unit Tests (Vitest + React Testing Library)
- Form validation (Zod schemas)
- Permission-based rendering
- Attendance display and filtering
- Route distance calculations
- Fraud status display

### Backend Tests
- Authentication flows
- Organization isolation (cross-tenant denial)
- Employee permission checks
- Check-in/check-out state transitions
- Duplicate request handling
- Location validation
- Fraud event creation
- RLS policy enforcement

### Android Tests (JUnit + Instrumentation)
- Permission flow
- Location parsing
- Tracking session lifecycle
- Offline queue integrity
- Synchronization retries
- Duplicate handling
- Mock-location signal processing
- Service lifecycle
- Check-in/check-out states

### End-to-End Tests (Playwright)
1. Admin creates employee
2. Employee logs in (Android)
3. Employee registers device
4. Employee checks in
5. Location records submitted
6. Admin sees employee on live map
7. Route history available
8. Employee checks out
9. Tracking ends
10. Attendance report correct

### Security Tests
- Cross-tenant access attempts
- Unauthorized route access
- Forged employee/org IDs
- Duplicate requests
- Invalid timestamps
- Malformed GPS payloads
- Privilege escalation
- Secret exposure scan
- Unauthenticated location insertion

## Running Tests

```bash
# Web unit tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build verification
npm run build
```

## Test Data

Use the seed process for local development. Demo data is clearly fictional and should not appear in production.

## Real Device Testing

See `docs/DEPLOYMENT.md` for the field testing checklist. Emulator testing is insufficient for GPS tracking validation.
