# Analyzer Management

Management API and frontend for the analyzer platform.

## Render deployment snapshot

The Render configuration observed in the `caii` workspace on 2026-08-06 is recorded in [docs/render-retirement.md](docs/render-retirement.md). It covers `analyzer-mgmt-api`, `analyzer-mgmt-frontend`, and `theorist-db`, including resource IDs, build/start commands, environment-variable names, and database settings.

**Retention decision: KEEP all three resources. Do not suspend or delete them.** The kept `the-critic-1` service points `REACT_APP_ANALYZER_MGMT_URL` at `analyzer-mgmt-frontend`, which depends on `analyzer-mgmt-api` and `theorist-db`.

The snapshot contains configuration metadata only. It is not a data or secrets backup; maintain separate, verified PostgreSQL backups.
