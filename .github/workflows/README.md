# GitHub Actions Workflows

## Pull Request CI Workflow

The `pull-request.yml` workflow runs automated quality checks on every pull request to the `master` branch.

### Workflow Structure

1. **Lint** - Runs ESLint to check code quality and style
2. **Parallel Jobs** (run after lint passes):
   - **Unit Tests** - Runs Vitest unit tests with coverage collection
   - **E2E Tests** - Runs Playwright end-to-end tests in the `integration` environment
3. **Status Comment** - Posts a success comment on the PR (only runs if all previous jobs pass)

### Required Secrets

The following secrets must be configured in your GitHub repository under the `integration` environment:

#### Supabase Configuration
- `SUPABASE_URL` - Your Supabase project URL (e.g., `https://your-project.supabase.co`)
- `SUPABASE_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

#### E2E Test Credentials
- `E2E_USERNAME` - Username for E2E test user
- `E2E_PASSWORD` - Password for E2E test user

> **Note**: The E2E test user must be created manually in your test database before running the workflow.

### Setting Up Secrets

1. Go to your repository settings
2. Navigate to **Environments** → **integration**
3. Add each secret listed above with the appropriate values

### Artifacts

The workflow uploads the following artifacts (retained for 7 days):
- **unit-test-coverage** - Unit test coverage reports
- **playwright-report** - E2E test reports with screenshots and videos on failure
- **e2e-test-coverage** - E2E test coverage (if configured)

### Triggering the Workflow

The workflow runs automatically when:
- A pull request is opened against `master`
- New commits are pushed to an open pull request

### Local Testing

To test the workflow locally before pushing:

```bash
# Run linting
npm run lint

# Run unit tests with coverage
npm run test:unit:coverage

# Run E2E tests (requires .env.test file)
npm run test:e2e
```

### Node.js Version

The workflow uses the Node.js version specified in `.nvmrc` (currently 22.14.0).

### Coverage Collection

- **Unit Tests**: Coverage is automatically collected via Vitest with v8 provider
- **E2E Tests**: Coverage collection is configured but requires additional setup with instrumentation tools

For questions or issues with the CI workflow, please contact the DevOps team.
