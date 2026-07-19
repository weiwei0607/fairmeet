# Project: fairmeet

## Architecture
- Frontend: React + Vite in `src/`
- Backend: Vercel Serverless Functions in `api/`
- Integration: Frontend calls backend serverless functions to request transit times via Google Maps Distance Matrix. API keys are managed securely on the serverless backend via `.env`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Exploration & Analysis | Codebase investigation and mapping out file entrypoints. | None | IN_PROGRESS |
| 2 | M2: Backend & Distance Matrix | Build/Update Vercel Serverless API to get real transit times from Google Maps API with secure key loading. | M1 | PLANNED |
| 3 | M3: Unfairness scoring logic | Scoring algorithm & `test_scoring.js` validation. | M2 | PLANNED |
| 4 | M4: Frontend Red Flag UI | Integrate scoring into React UI & render visual Red Flag indicator. | M3 | PLANNED |
| 5 | M5: E2E Verification & Hardening | Final E2E checks and adversarial review. | M4 | PLANNED |

## Interface Contracts
### Frontend ↔ Backend (Distance/Scoring API)
- Request: Body/query parameters specifying origins and destination candidates.
- Response: JSON output representing duration and distance matrix.

## Code Layout
- `.agents/` - Coordination and agent workspace metadata (no source code).
- `api/` - Backend serverless functions.
- `src/` - Frontend React application.
- `package.json` - Node dependencies and build scripts.
- `test_scoring.js` - Scoring verification test script (at root level).
