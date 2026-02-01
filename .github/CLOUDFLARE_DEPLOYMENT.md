# Cloudflare Pages Deployment Guide

This guide explains how to deploy Cook Mastery to Cloudflare Pages using the automated CI/CD pipeline.

## Prerequisites

1. A Cloudflare account with Pages enabled
2. A GitHub repository with the Cook Mastery codebase
3. A Supabase project set up for your application

## Initial Setup

### 1. Create Cloudflare Pages Project

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Create Application** → **Pages**
3. Choose **Direct Upload** as the deployment method
4. Give your project a name (e.g., `cook-mastery`)
5. Note your **Project Name** for later use

### 1.1 Create KV Namespace for Sessions

The Astro Cloudflare adapter requires a KV namespace for session storage:

1. In Cloudflare Dashboard, go to **Workers & Pages** → **KV**
2. Click **Create a namespace**
3. Name it `cook-mastery-sessions` (or any name you prefer)
4. Note the **Namespace ID** (you'll need it later)
5. After creating your Pages project, go to **Settings** → **Functions** → **KV namespace bindings**
6. Click **Add binding**:
   - Variable name: `SESSION`
   - KV namespace: Select the namespace you created
7. Click **Save**

### 2. Get Cloudflare Credentials

#### API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Edit Cloudflare Workers** template or create a custom token with:
   - **Permissions**:
     - Account → Cloudflare Pages → Edit
   - **Account Resources**:
     - Include → Your specific account
4. Click **Continue to summary** → **Create Token**
5. Copy and save the token securely (you won't see it again)

#### Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Your **Account ID** is displayed in the right sidebar
4. Copy and save it

### 3. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** for each:

| Secret Name | Description | Where to find |
|------------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | API token for Cloudflare deployment | Created in step 2 above |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Found in Cloudflare dashboard |
| `CLOUDFLARE_PROJECT_NAME` | Your Cloudflare Pages project name | The name you chose in step 1 |
| `SUPABASE_URL` | Your Supabase project URL | Supabase project settings |
| `SUPABASE_KEY` | Supabase anonymous key (public) | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (private) | Supabase project settings |

### 4. Configure GitHub Environment

1. Go to your repository → **Settings** → **Environments**
2. Click **New environment**
3. Name it `production`
4. (Optional) Add protection rules:
   - Required reviewers
   - Wait timer
   - Deployment branches (only `master`)

## Deployment Process

### Automatic Deployment

Every push to the `master` branch triggers the deployment workflow automatically:

1. **Lint** - Code quality checks
2. **Unit Tests** - Run test suite with coverage
3. **Deploy** - Build and deploy to Cloudflare Pages
4. **Status** - Post deployment summary

### Manual Deployment

To manually trigger a deployment:

1. Ensure all changes are committed to the `master` branch
2. Push to GitHub:
   ```bash
   git push origin master
   ```
3. Monitor the deployment in the **Actions** tab of your GitHub repository

## Build Configuration

The project uses the following build configuration for Cloudflare:

- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Node Version**: Specified in `.nvmrc` (22.14.0)
- **Adapter**: `@astrojs/cloudflare` (advanced mode)

## Environment Variables

The build process uses the following environment variables:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `CLOUDFLARE_ENV` - Set to "1" to trigger Cloudflare adapter

## Troubleshooting

### Missing Entry-Point Error

If you see the error "Missing entry-point to Worker script or to assets directory":

1. **Check KV Namespace Binding**: Ensure the `SESSION` KV namespace is properly bound to your Pages project
   - Go to your Pages project → **Settings** → **Functions** → **KV namespace bindings**
   - Verify the `SESSION` binding exists and points to your KV namespace

2. **Verify Build Output**: The build should generate a `_worker.js` directory with an `index.js` file:
   ```bash
   dist/
   ├── _worker.js/
   │   ├── index.js
   │   └── ... (other files)
   ├── _routes.json
   └── ... (static assets)
   ```

3. **Check Build Environment**: Ensure `CLOUDFLARE_ENV` is set to "1" during build:
   ```bash
   # This should be set in your GitHub Actions workflow
   CLOUDFLARE_ENV: "1"
   ```

4. **Re-deploy**: Sometimes a fresh deployment resolves the issue:
   ```bash
   # Locally
   rm -rf dist node_modules/.vite
   CLOUDFLARE_ENV=1 npm run build
   
   # Or push to master to trigger CI/CD
   git push origin master
   ```

### Deployment Fails

1. Check the GitHub Actions logs for specific error messages
2. Verify all secrets are correctly set in GitHub
3. Ensure the Cloudflare project exists and is accessible
4. Verify the API token has the correct permissions

### Build Fails

1. Check if all dependencies are correctly installed (`npm ci`)
2. Verify the build works locally:
   ```bash
   CLOUDFLARE_ENV=1 npm run build
   ```
3. Check for linting errors:
   ```bash
   npm run lint
   ```

### Environment Variables Not Working

1. Ensure secrets are added to the GitHub repository (not the environment)
2. Verify secret names match exactly (case-sensitive)
3. Check that the `production` environment is correctly configured

## Local Development with Cloudflare Adapter

To test the Cloudflare adapter locally:

```bash
# Set environment variable
export CLOUDFLARE_ENV=1  # On Windows: $env:CLOUDFLARE_ENV="1"

# Build the project
npm run build

# Preview the build
npm run preview
```

To use the Node adapter (default for local development):

```bash
# Simply run without CLOUDFLARE_ENV
npm run dev
```

## Monitoring Deployments

### Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → Your project
3. View deployments, logs, and analytics

### GitHub Actions

1. Go to your repository → **Actions** tab
2. Click on **Deploy to Cloudflare Pages** workflow
3. View detailed logs for each deployment

## Rollback

If a deployment causes issues:

### Via Cloudflare Dashboard

1. Go to your project in Cloudflare Dashboard
2. Navigate to **Deployments**
3. Find a previous successful deployment
4. Click **Rollback to this deployment**

### Via GitHub

1. Revert the problematic commit:
   ```bash
   git revert <commit-hash>
   git push origin master
   ```
2. The workflow will automatically deploy the reverted code

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Astro Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
