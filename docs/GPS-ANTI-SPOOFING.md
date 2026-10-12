# FieldTrack — GPS Anti-Spoofing

## Approach

FieldTrack uses **layered detection** — no single signal is sufficient to prove or disprove GPS authenticity. Multiple evidence sources are combined into a server-side trust decision.

## Detection Layers

### 1. Mock Location Signal (Android)
- `Location.isMock()` API check
- Recorded per location point
- **Limitation**: Absence of mock flag does NOT prove authenticity. Some spoofing methods bypass this flag.

### 2. Google Play Integrity
- Server-verified integrity tokens
- Checked during: device registration, check-in, check-out, periodic session validation
- Request binding via `request_hash` to prevent replay
- **Limitation**: Requires Google Play Services on the device

### 3. Device Binding
- Employee account bound to a registered device
- Device revocation supported
- Detects: unrecognized devices, device replacement, unexpected session changes
- Does NOT use IMEI as primary identity (privacy concern)

### 4. Movement Plausibility
- Distance between consecutive points
- Time difference and implied speed
- Accuracy-aware movement calculation
- Flags impossible movement (e.g., 500km in 30 seconds)
- **Limitation**: Fast movement may be legitimate (highway, train). Transport mode and GPS error are considered.

### 5. Location Quality
- Horizontal accuracy evaluation
- Stale location detection (old timestamps)
- Repeated identical coordinates
- Abrupt coordinate jumps
- Missing intervals / gaps
- Provider/source changes

### 6. Device/App Risk
- Platform-supported integrity signals
- Does NOT rely on brittle root-detection tricks as sole control
- Does NOT claim to detect every rooted device

## Trust Status

| Status | Meaning |
|--------|---------|
| TRUSTED | All checks passed, high confidence |
| REVIEW_REQUIRED | Some signals need human review |
| HIGH_RISK | Strong evidence of anomaly |
| UNVERIFIED | Not enough evidence to decide |

## Fraud Event Types

- `mock_location_signal`: Mock flag detected
- `integrity_verification_failed`: Play Integrity check failed
- `impossible_movement`: Speed exceeds physical possibility
- `timestamp_inconsistency`: Capture time doesn't match elapsed time
- `location_jump`: Sudden large coordinate change
- `device_mismatch`: Session from unexpected device
- `tracking_gap`: Missing data intervals
- `unusual_location_pattern`: Repeated coordinates or patterns

## Review Process

- Fraud events are NOT automatic proof of misconduct
- Events are reviewed by authorized admins
- Admin can: resolve as legitimate, resolve as fraud, escalate
- Resolution reason is recorded
- Original evidence is preserved
- No automatic salary deduction or termination from GPS anomalies alone

## Server-Side Authority

- The Android client does NOT assign its own fraud score
- Trust decisions are made server-side in edge functions
- All evidence is stored for review
