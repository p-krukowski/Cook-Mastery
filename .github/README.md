# GitHub Actions Documentation Index

Welcome! This directory contains the GitHub Actions CI/CD configuration for Cook Mastery.

## 🚀 Quick Start

**New to the CI workflow?** Start here:
1. Read [SETUP_GUIDE.md](SETUP_GUIDE.md) - Step-by-step setup instructions
2. Configure your secrets (see setup guide)
3. Create a test PR to verify everything works

## 📚 Documentation Files

### Essential Reading

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[SETUP_GUIDE.md](SETUP_GUIDE.md)** | Quick setup instructions and troubleshooting | **Start here!** First time setup |
| **[COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)** | Implementation overview and requirements checklist | Understanding what was built |
| **[workflows/pull-request.yml](workflows/pull-request.yml)** | The actual workflow configuration | Modifying the workflow |

### Reference Documentation

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[workflows/README.md](workflows/README.md)** | Detailed workflow documentation | Understanding workflow structure |
| **[WORKFLOW_SUMMARY.md](WORKFLOW_SUMMARY.md)** | Technical implementation details | Deep dive into the implementation |
| **[WORKFLOW_DIAGRAM.md](WORKFLOW_DIAGRAM.md)** | Visual flow diagrams | Visual learners, presentations |

## 🔑 Key Concepts

### Workflow Structure
```
Lint → (Unit Tests ‖ E2E Tests) → Status Comment
```

### Required Secrets (integration environment)
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `E2E_USERNAME`
- `E2E_PASSWORD`

### Jobs Overview

| Job | Purpose | Duration | Dependencies |
|-----|---------|----------|--------------|
| **lint** | Code quality checks | ~30s-1m | None |
| **unit-test** | Run Vitest tests | ~1-3m | lint |
| **e2e-test** | Run Playwright tests | ~3-5m | lint |
| **status-comment** | Post success message | ~5s | All above |

## 🎯 Common Tasks

### View Workflow Run
1. Go to your PR
2. Click "Checks" tab
3. View individual job logs

### Download Artifacts
1. Go to PR checks
2. Scroll to bottom of workflow run
3. Download coverage reports or test results

### Update Workflow
1. Edit `.github/workflows/pull-request.yml`
2. Commit and push
3. Workflow will use new version on next PR

### Troubleshooting
See [SETUP_GUIDE.md](SETUP_GUIDE.md) → "🐛 Troubleshooting" section

## 🔧 Technical Stack

- **CI**: GitHub Actions
- **Test Runner (Unit)**: Vitest
- **Test Runner (E2E)**: Playwright
- **Linter**: ESLint
- **Node.js**: 22.14.0 (from `.nvmrc`)
- **Package Manager**: npm (using `npm ci`)

## 📊 Artifacts Generated

| Artifact | Contains | Retention |
|----------|----------|-----------|
| `unit-test-coverage` | Vitest coverage reports | 7 days |
| `playwright-report` | E2E test results, screenshots, videos | 7 days |
| `e2e-test-coverage` | E2E coverage (if configured) | 7 days |

## 🔒 Security & Environments

### Integration Environment
The `integration` environment is used for E2E tests to:
- Isolate test secrets from production
- Control deployment permissions
- Manage test-specific configuration

### Secret Management
- Secrets stored in GitHub environment
- Never exposed in logs
- Accessed only during workflow runs

## 📖 Learning Resources

### GitHub Actions
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)

### Testing Tools
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [ESLint Documentation](https://eslint.org/)

## 🤝 Contributing

### Making Changes to the Workflow

1. **Test locally first**
   ```bash
   npm run lint
   npm run test:unit:coverage
   npm run test:e2e
   ```

2. **Update documentation**
   - Update relevant `.md` files
   - Keep diagrams in sync

3. **Test on a PR**
   - Create test branch
   - Push changes
   - Verify workflow runs correctly

4. **Update this index if needed**
   - Add new documents
   - Update links
   - Keep structure clear

## 📞 Support

### Common Issues
- **Workflow not running?** → Check PR is against `master` branch
- **E2E tests failing?** → Verify secrets are set correctly
- **Coverage not uploading?** → Check file paths match expectations

### Getting Help
1. Check [SETUP_GUIDE.md](SETUP_GUIDE.md) troubleshooting section
2. Review workflow logs in GitHub Actions tab
3. Check individual job logs for error messages

## 📅 Maintenance

### Regular Updates
- Review action versions quarterly
- Update Node.js version when upgrading project
- Monitor workflow execution times

### Action Version Updates
Use this command to check for updates:
```bash
curl -s https://api.github.com/repos/{owner}/{repo}/releases/latest | grep '"tag_name":'
```

Example:
```bash
curl -s https://api.github.com/repos/actions/checkout/releases/latest | grep '"tag_name":'
```

## ✅ Checklist for New Team Members

- [ ] Read [SETUP_GUIDE.md](SETUP_GUIDE.md)
- [ ] Understand workflow structure (see [WORKFLOW_DIAGRAM.md](WORKFLOW_DIAGRAM.md))
- [ ] Know where secrets are stored (Settings → Environments → integration)
- [ ] Can run tests locally
- [ ] Know how to view workflow runs
- [ ] Know how to download artifacts
- [ ] Understand how to make workflow changes

---

**Last Updated**: February 1, 2026
**Workflow Version**: 1.0
**Status**: ✅ Active and Production Ready
