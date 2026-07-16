# Testing Guide

## Test Types

- Unit tests: AI modules and scoring behavior.
- Integration tests: API auth, candidate, recruiter, admin, review, and application workflows.
- UI smoke tests: required routes, accessibility shell, dark mode, and key screen strings.

## Commands

```bash
npm test
npm run verify
```

On Windows PowerShell, use `npm.cmd test` and `npm.cmd run verify` if script execution policy blocks `npm`.

`npm run verify` performs syntax checks, frontend build, and the full test suite.

## What Verification Covers

- Backend entrypoint parses successfully.
- Backend routes parse successfully.
- Frontend app parses successfully.
- Frontend production bundle is generated.
- Unit, API integration, and UI smoke tests pass.

## Resetting Test Data

```bash
npm run reset:data
```

On Windows PowerShell, use `npm.cmd run reset:data` if needed.

This removes the local JSON data file so the next app start recreates seed data.
