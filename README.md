# Serverless Notes App

A full-stack serverless notes application with authentication built on AWS. 
Users can sign up, log in, and manage their own private notes — fully secured 
with JWT authentication via AWS Cognito.

## Architecture
<img width="1662" height="946" alt="Image Apr 29, 2026, 08_17_59 PM" src="https://github.com/user-attachments/assets/693efe47-88ce-40f2-8cab-a8f1b037d08e" />

## Services Used
- S3 — static frontend hosting
- CloudFront — CDN and HTTPS
- API Gateway — HTTP API with JWT authorization
- Lambda (x7) — auth and notes functions
- DynamoDB — stores user notes
- Cognito — user authentication and JWT token generation
- IAM — permissions between services

## Live Demo
https://d14epsa66ni60v.cloudfront.net

## Features
- Sign up with email and password
- Email verification via Cognito
- Login with JWT token authentication
- Create, read, update and delete notes
- Each user only sees their own notes
- Fully serverless — no servers to manage

## How It Works
1. User signs up → Cognito sends verification email
2. User verifies email with 6-digit code
3. User logs in → Cognito returns JWT token
4. Frontend stores token in localStorage
5. Every API call sends token in Authorization header
6. API Gateway validates token with Cognito before allowing access
7. Lambda extracts user ID from token to query only that user's notes

## Lambda Functions
- `auth_signup` — registers new user in Cognito
- `auth_verify` — confirms email verification code
- `auth_login` — authenticates user and returns JWT tokens
- `notes_create` — creates a new note in DynamoDB
- `notes_get` — retrieves all notes for the authenticated user
- `notes_update` — updates an existing note
- `notes_delete` — deletes a note

## What I Learned
- How AWS Cognito User Pools work
- How JWT tokens carry user identity between requests
- How to protect API routes with a JWT authorizer in API Gateway
- How SECRET_HASH works in Cognito app clients with secrets
- How to extract user ID from JWT claims in Lambda
- How to structure user-specific data in DynamoDB using userId as partition key
- Full CRUD operations with DynamoDB

## Challenges
- Cognito app client was created with a client secret which browser-based apps 
  can't use directly — solved by routing auth through Lambda functions that 
  compute the SECRET_HASH server-side
- USER_PASSWORD_AUTH flow was not enabled on the app client by default — 
  had to enable it manually in Cognito settings
- Cognito authorizer needed to be attached to each route individually — 
  auth routes (signup, verify, login) must remain public while notes routes 
  are protected
