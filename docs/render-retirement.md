# Render deployment snapshot (retained stack)

Captured on **2026-08-06** from the Render workspace **`caii`** during a retirement audit. No service was suspended, deleted, or otherwise changed while producing this record.

This document records names and configuration metadata only. It deliberately excludes environment values, secret contents, database URLs, passwords, and connection information. It is **not a data backup**; maintain separate, verified PostgreSQL backups.

## Retention decision: KEEP

**Keep `analyzer-mgmt-api`, `analyzer-mgmt-frontend`, and `theorist-db`. Do not suspend or delete any of them.**

The kept Render service `the-critic-1` has `REACT_APP_ANALYZER_MGMT_URL` pointed at `analyzer-mgmt-frontend`. That frontend in turn depends on `analyzer-mgmt-api` and `theorist-db`, and the API's `DATABASE_URL` directly matches `theorist-db`. This active chain is the reason all three resources are retained.

## Project and environment

| Field | Captured value |
| --- | --- |
| Render project | `the-theorist` (`prj-d5tg6mlactks73a729pg`) |
| Environment | `Production` (`evm-d5tg6mlactks73a729q0`) |
| Environment protection | Unprotected |
| Network isolation | Disabled |
| Environment IP allow list | `0.0.0.0/0` (`everywhere`) |
| Environment groups | None |
| Current listed monthly cost | **$20.30** total ($7 API + $7 frontend + $6.30 database/storage) |

## Retained resources

| Resource | ID | Type | Status | Plan/runtime | Region | Instances/storage |
| --- | --- | --- | --- | --- | --- | --- |
| `analyzer-mgmt-api` | `srv-d5th0qnpm1nc739bunv0` | Web service | Running; `not_suspended` | `starter`; Python | Oregon | 1 instance |
| `analyzer-mgmt-frontend` | `srv-d5th0tali9vc73a8dakg` | Web service | Running; `not_suspended` | `starter`; Node | Oregon | 1 instance |
| `theorist-db` | `dpg-d5th0h7pm1nc739buh10-a` | PostgreSQL primary | Available; `not_suspended` | `basic_256mb`; PostgreSQL 16 | Oregon | 1 GB database storage |

Dashboard links:

- API: <https://dashboard.render.com/web/srv-d5th0qnpm1nc739bunv0>
- Frontend: <https://dashboard.render.com/web/srv-d5th0tali9vc73a8dakg>
- Database: <https://dashboard.render.com/d/dpg-d5th0h7pm1nc739buh10-a>

## Source and deploy configuration

Both web services used:

| Field | Value |
| --- | --- |
| Repository | <https://github.com/yauhenio2025/analyzer-mgmt> |
| Branch | `master` |
| Root directory | Repository root (empty Render `rootDir`) |
| Auto deploy | Enabled |
| Auto-deploy trigger | Commit |
| Pull-request previews | Disabled |
| Preview generation | Off |
| Build plan/cache | `performance`; `no-cache` |

### `analyzer-mgmt-api`

- Build: `cd api && pip install -r requirements.txt`
- Start: `cd api && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health-check path: not configured
- Open port: `10000/TCP`
- Service IP allow list: `0.0.0.0/0` (`everywhere`)
- Maintenance mode: disabled
- URL at capture: <https://analyzer-mgmt-api.onrender.com>
- Live deploy: `dep-d7e6mr741pts73a4h78g`, trigger `new_commit`, created `2026-04-13T04:05:00.575145Z`, finished `2026-04-13T04:06:37.645993Z`
- Live commit: `0ce31a96506232311908a966f3d00b0636d47b6c` (`Harden concept artifact operator state on job pages`)

### `analyzer-mgmt-frontend`

- Build: `cd frontend && npm install && npm run build`
- Start: `cd frontend && npm start`
- Health-check path: not configured
- Open port: `10000/TCP`
- Service IP allow list: `0.0.0.0/0` (`everywhere`)
- Maintenance mode: disabled
- URL at capture: <https://analyzer-mgmt-frontend.onrender.com>
- Live deploy: `dep-d7e6mr741pts73a4h75g`, trigger `new_commit`, created `2026-04-13T04:05:00.429465Z`, finished `2026-04-13T04:08:36.974607Z`
- Live commit: `0ce31a96506232311908a966f3d00b0636d47b6c` (`Harden concept artifact operator state on job pages`)

## Environment and edge configuration

Only names are retained; values must be restored from an authorized secret store.

| Resource | Environment-variable names | Secret-file names |
| --- | --- | --- |
| `analyzer-mgmt-api` | `ANTHROPIC_API_KEY`, `DATABASE_URL`, `ENVIRONMENT`, `GRIDS_API_KEY` | None |
| `analyzer-mgmt-frontend` | `API_URL`, `NEXT_PUBLIC_API_URL` | None |

At capture, both services had:

- no custom domains;
- no custom routes;
- no custom response headers.

## PostgreSQL settings

| Field | Captured value |
| --- | --- |
| Name / ID | `theorist-db` / `dpg-d5th0h7pm1nc739buh10-a` |
| Database / user | `theorist_db` / `theorist_db_user` |
| Version / role | PostgreSQL 16 / primary |
| Plan / region | `basic_256mb` / Oregon |
| Storage | 1 GB; disk autoscaling disabled |
| High availability | Disabled |
| Connection pool | None |
| Read replicas | None |
| IP allow list | `0.0.0.0/0` (`everywhere`) |
| Status | Available; `not_suspended` |
| Last recorded maintenance | Succeeded; scheduled `2026-04-07T05:50:00Z` |

No database URL, password, or connection string is stored here.

## Persistent disks

The workspace disk inventory contained **no persistent disk attached to either target web service**. The database's 1 GB managed storage is described separately above.

## Rebuild outline

1. Provision PostgreSQL 16 in Oregon with the captured database name, user, plan, storage, and network policy.
2. Restore a separately verified PostgreSQL export. This repository does not contain that data.
3. Recreate `analyzer-mgmt-api` from the `master` branch and repository root with the captured build/start commands, plan, port, and environment-variable names.
4. Recreate `analyzer-mgmt-frontend` from the same branch/root with its captured build/start commands and environment-variable names.
5. Restore environment values through Render or an authorized secret store; do not derive them from this document.
6. Verify the API, frontend, database, and `the-critic-1` consumer integration after any rebuild.

There was no root `render.yaml` or `render.yml` on the captured repository branch. This snapshot is descriptive and does not create a Render Blueprint.
