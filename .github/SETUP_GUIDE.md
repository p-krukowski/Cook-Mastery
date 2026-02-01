# Quick Setup Guide for Pull Request CI

## 🎯 What Was Created

✅ `.github/workflows/pull-request.yml` - Main workflow file
✅ `.github/workflows/README.md` - Workflow documentation
✅ `.github/WORKFLOW_SUMMARY.md` - Implementation details

## 🚀 Quick Start - Next Steps

### 1. Configure GitHub Environment & Secrets

Go to your GitHub repository:
1. **Settings** → **Environments** → **New environment**
2. Name: `integration`
3. Add these secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `E2E_USERNAME` | Test user username | `testuser@example.com` |
| `E2E_PASSWORD` | Test user password | `SecureTestPass123!` |

### 2. Create E2E Test User

In your test Supabase instance:
```sql
-- Create test user manually in Supabase dashboard or via SQL
-- Use the same credentials as E2E_USERNAME and E2E_PASSWORD
```

Or use your app's signup:
```bash
# Visit your test environment and sign up with E2E_USERNAME and E2E_PASSWORD
```

### 3. Test Locally First (Recommended)

```bash
# 1. Create .env.test file
cp .env.test.example .env.test
# Edit .env.test with your test credentials

# 2. Run all checks locally
npm run lint
npm run test:unit:coverage
npm run test:e2e

# 3. Verify everything passes
```

### 4. Create a Test Pull Request

```bash
# Create a test branch
git checkout -b test/ci-workflow

# Make a small change (e.g., add a comment)
echo "# Test CI" >> README.md

# Commit and push
git add README.md
git commit -m "test: verify CI workflow"
git push origin test/ci-workflow

# Create PR on GitHub and watch the workflow run!
```

## 📊 Workflow Execution Order

```
PR Created/Updated
       ↓
   [1. Lint] ← Runs first
       ↓
   ┌───┴───┐
   ↓       ↓
[2. Unit] [3. E2E] ← Run in parallel
   └───┬───┘
       ↓
[4. Comment] ← Only if all pass
```

## ✅ Success Criteria

When working correctly, you'll see:
- ✅ Green checkmarks on all jobs
- ✅ Coverage artifacts uploaded
- ✅ Success comment posted on PR
- ✅ Playwright report available (if failures occur)

## ⚠️ Important Notes

### E2E Coverage Collection
The workflow uploads E2E coverage artifacts, but Playwright doesn't collect code coverage by default. The upload step will skip if no coverage is found. To enable E2E coverage:
- Install instrumentation tools (istanbul/babel-plugin-istanbul)
- Configure Playwright to collect coverage
- This is optional and not required for the workflow to work

### CI Environment Variable
The workflow sets `CI=true` for E2E tests, which:
- Disables `reuseExistingServer` in Playwright
- Enables 2 retries for flaky tests
- Uses 1 worker for consistent test execution

### Browser Installation
The workflow uses `npm run test:e2e:install` which installs only Chromium (as configured in `playwright.config.ts`).

## 🐛 Troubleshooting

### Workflow not running?
- Check that you're creating PRs against `master` branch
- Verify workflow file is in correct location
- Check Actions tab for any errors

### E2E tests failing?
- Verify all secrets are set correctly in integration environment
- Ensure E2E test user exists in test database
- Check Playwright report artifact for details

### Lint or unit tests failing?
- Run locally first to catch issues
- Check error messages in Actions tab
- Ensure all dependencies are in package.json

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)

For detailed workflow information, see `.github/WORKFLOW_SUMMARY.md`
