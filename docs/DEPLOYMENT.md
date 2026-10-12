# FieldTrack — Deployment

## Prerequisites

- Node.js 18+
- npm
- Supabase project (already provisioned)
- Android Studio (for Android app)

## Local Development

### Admin Web

```bash
npm install
npm run dev
```

The app runs on http://localhost:3000. Supabase credentials are pre-configured in `.env`.

### Environment Variables

The following are pre-populated and do NOT need manual configuration:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Database Migrations

Migrations are applied via the Supabase MCP tools. The SQL files in `supabase/migrations/` are for reference — they are applied through `mcp__supabase__apply_migration`.

### Edge Functions

Edge functions are deployed via the Supabase MCP `deploy_edge_functions` tool. They are NOT deployed by writing files to disk alone.

## Production Deployment

### Web (Netlify)

The project includes `netlify.toml` for Netlify deployment:
```bash
npm run build
```

Deploy to Netlify via Git integration or CLI.

### Android

1. Open `apps/android` in Android Studio
2. Configure `local.properties` with Supabase URL and anon key
3. Build the APK: `./gradlew assembleRelease`
4. Sign with your keystore

## Production Checklist

- [ ] Change default data retention to appropriate value
- [ ] Configure privacy contact email
- [ ] Set up Google Play Integrity (requires Google Cloud project)
- [ ] Configure FCM for push notifications
- [ ] Test with real Android devices
- [ ] Review RLS policies with security audit
- [ ] Set up CI/CD pipeline
- [ ] Configure custom map tile provider (don't rely on public OSM)
- [ ] Review legal compliance for your jurisdiction

## Free Tier Limitations

- Supabase free tier: 500MB database, 50K monthly active users
- OpenStreetMap public tiles: rate-limited, not for production scale
- Google Play Integrity: requires Google Cloud project
- FCM: free for reasonable volume

For a 20-50 employee pilot, the free tier is sufficient. Scale to paid tiers as data volume grows.
