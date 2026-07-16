# HerSphere API Documentation

Base URL: `http://localhost:4000`

All JSON responses use this shape for errors:

```json
{
  "error": {
    "message": "Human readable message",
    "requestId": "trace-id"
  }
}
```

## Authentication

Get CSRF token:

```http
GET /api/security/csrf
```

Register:

```http
POST /api/auth/register
X-CSRF-Token: <csrf>
Content-Type: application/json
```

```json
{
  "name": "Nisha Verma",
  "email": "nisha@example.test",
  "password": "Password123!",
  "role": "candidate",
  "skills": ["React", "SQL"]
}
```

Login:

```http
POST /api/auth/login
X-CSRF-Token: <csrf>
```

```json
{
  "email": "candidate@hersphere.test",
  "password": "Password123!"
}
```

Current user:

```http
GET /api/auth/me
Authorization: Bearer <token>
```

Forgot password:

```http
POST /api/auth/forgot-password
X-CSRF-Token: <csrf>
```

Verify email:

```http
POST /api/auth/verify-email
X-CSRF-Token: <csrf>
```

## Candidate APIs

```http
GET /api/candidate/profile
PUT /api/candidate/profile
GET /api/career/dashboard
GET /api/ai/analysis
GET /api/learning-roadmap
POST /api/resume/analyze
GET /api/applications/me
```

Candidate routes require a candidate token.

Resume analysis request:

```json
{
  "resumeText": "Resume text here",
  "merge": true
}
```

## Jobs and Internships

```http
GET /api/jobs
GET /api/jobs?type=internship&search=react&location=remote
GET /api/jobs/:id
POST /api/jobs/:id/bookmark
POST /api/jobs/:id/apply
```

Bookmark and apply require a candidate token.

Apply request:

```json
{
  "coverNote": "I am interested in this role."
}
```

## Companies and Reviews

```http
GET /api/companies
GET /api/companies/:id
GET /api/companies/:id/reviews
POST /api/companies/:id/reviews
```

Review request:

```json
{
  "title": "Supportive mentorship",
  "comment": "Managers document safety practices and mentorship is visible.",
  "verifiedEmployment": true,
  "ratings": {
    "workCulture": 4.5,
    "safety": 4.8,
    "mentorship": 4.4,
    "careerGrowth": 4.2,
    "workLifeBalance": 4.6
  }
}
```

## Recruiter APIs

```http
GET /api/recruiter/dashboard
POST /api/recruiter/listings
PUT /api/recruiter/listings/:id
DELETE /api/recruiter/listings/:id
GET /api/recruiter/listings/:id/applicants
PATCH /api/recruiter/applications/:id/status
POST /api/recruiter/interviews
```

Recruiter posting requires approved recruiter status and verified company status.

## Admin APIs

```http
GET /api/admin/dashboard
GET /api/admin/users
PATCH /api/admin/users/:id/status
PATCH /api/admin/companies/:id/verification
PATCH /api/admin/recruiters/:id/approval
PATCH /api/admin/reviews/:id/moderation
GET /api/admin/reports
```

Admin routes require an admin token.
