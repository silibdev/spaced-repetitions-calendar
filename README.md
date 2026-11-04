# SpacedRepetitionsCalendar

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 13.0.3.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build

Run `ng build` for a production build. Run `ng test` to execute unit tests.

## Backend configuration

Netlify Functions connect to Neon using the official `@neondatabase/serverless` driver. Configure `DATABASE_URL` with the Neon PostgreSQL connection string as a server-side environment variable. The connector explicitly uses the `db` schema; the connection string and credentials must never be exposed in the Angular client.

Photos use Neon Object Storage through its S3-compatible API and the AWS SDK for JavaScript v3. Configure these server-side environment variables:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ENDPOINT_URL_S3`

The object bucket is `db-photos`. Files keep the existing key format `<user-id>/<photo-id>`.

For local Netlify Functions, put these values in `db-scripts/.env` (do not commit secrets). Start the functions with `npm run start:functions`.

## Update database types

`netlify/utils/database.type.ts` describes the tables in schema `db`. Keep it aligned with the Neon schema when that schema changes.

## Release

Do a release with git-flow, update the version with npm and then finish the release deleting the tag created by npm (we're using the git-flow one).
