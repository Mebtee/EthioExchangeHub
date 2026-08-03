# Backend Test Suite (Phase 2I)

Automated testing layer following Clean Architecture. Tests never touch a real
database — repositories and the full HTTP stack run against an in-memory fake
Supabase client, and services/controllers run against mock collaborators.

## Commands

```bash
npm test              # run all tests once
npm run test:coverage # run all tests with coverage thresholds (90/85/90/90)
```

## Layout

```
tests/
├── unit/
│   ├── repositories/   # every repository against the fake Supabase client
│   ├── services/       # every service + shared helpers with mocked repositories
│   ├── controllers/    # every controller with mocked services
│   ├── validators/     # every validator (valid/invalid/boundary)
│   ├── middleware/     # validation, asyncHandler, not-found, error-handler
│   ├── utils/          # api-response, date, pagination, validate-env
│   └── lib/            # supabase client + connection verification
├── integration/
│   ├── api/            # full HTTP stack via Supertest (mocked Supabase module)
│   └── database/       # real repositories + services over the seeded fake client
├── fixtures/           # typed seed rows matching the live schema
├── mocks/              # fake Supabase client, mock repositories, services, express
├── helpers/            # shared integration helper (fake client singleton + seeding)
└── setup/
    └── env.ts          # required env vars before any src/ module is imported
```

## Principles

- **No production data**: `@/lib/supabase` is mocked in API integration tests;
  repository tests inject the fake client directly.
- **No production code in tests**: helpers/mocks only.
- **Response contract verified**: every endpoint returns
  `{ success, message, data }`; every error returns `{ success: false, message, data: null }`.
- **CI-ready**: `npm test` and `npm run test:coverage` need no manual steps.
