# Pull Request CI Workflow Diagram

## Workflow Structure

```mermaid
graph TD
    A[Pull Request Created/Updated] --> B[Job 1: Lint Code]
    B --> C{Lint Passed?}
    C -->|Yes| D[Job 2: Unit Tests]
    C -->|Yes| E[Job 3: E2E Tests]
    C -->|No| F[Workflow Failed]
    
    D --> G{Unit Tests Passed?}
    E --> H{E2E Tests Passed?}
    
    G -->|Yes| I{All Jobs Passed?}
    H -->|Yes| I
    G -->|No| F
    H -->|No| F
    
    I -->|Yes| J[Job 4: Post Success Comment]
    I -->|No| F
    
    J --> K[Workflow Complete ✅]
    F --> L[Workflow Failed ❌]
    
    style A fill:#e1f5ff
    style B fill:#fff4e6
    style D fill:#e8f5e9
    style E fill:#e8f5e9
    style J fill:#f3e5f5
    style K fill:#c8e6c9
    style L fill:#ffcdd2
```

## Job Details

### Job 1: Lint (Sequential)
```mermaid
graph LR
    A[Checkout Code] --> B[Setup Node.js v22.14.0]
    B --> C[Install Dependencies npm ci]
    C --> D[Run ESLint]
    D --> E{Success?}
    E -->|Yes| F[Proceed to Tests]
    E -->|No| G[Fail Workflow]
    
    style A fill:#e3f2fd
    style D fill:#fff9c4
    style F fill:#c8e6c9
    style G fill:#ffcdd2
```

### Job 2 & 3: Unit Tests + E2E Tests (Parallel)

#### Unit Tests
```mermaid
graph LR
    A[Checkout Code] --> B[Setup Node.js]
    B --> C[Install Dependencies]
    C --> D[Run Vitest with Coverage]
    D --> E[Upload Coverage Artifact]
    E --> F{Success?}
    F -->|Yes| G[Continue]
    F -->|No| H[Fail]
    
    style D fill:#fff9c4
    style E fill:#e1bee7
    style G fill:#c8e6c9
    style H fill:#ffcdd2
```

#### E2E Tests (Integration Environment)
```mermaid
graph LR
    A[Checkout Code] --> B[Setup Node.js]
    B --> C[Install Dependencies]
    C --> D[Install Playwright Chromium]
    D --> E[Create .env.test from Secrets]
    E --> F[Run Playwright Tests]
    F --> G[Upload Test Report]
    G --> H[Upload Coverage if exists]
    H --> I{Success?}
    I -->|Yes| J[Continue]
    I -->|No| K[Fail]
    
    style E fill:#ffecb3
    style F fill:#fff9c4
    style G fill:#e1bee7
    style H fill:#e1bee7
    style J fill:#c8e6c9
    style K fill:#ffcdd2
```

### Job 4: Status Comment (Conditional)
```mermaid
graph LR
    A{All Previous Jobs Passed?} -->|Yes| B[Post Success Comment to PR]
    A -->|No| C[Skip Job]
    B --> D[Workflow Complete]
    
    style A fill:#fff9c4
    style B fill:#e1bee7
    style D fill:#c8e6c9
    style C fill:#e0e0e0
```

## Environment & Secrets Flow

```mermaid
graph TD
    A[GitHub Secrets in Integration Environment] --> B[SUPABASE_URL]
    A --> C[SUPABASE_KEY]
    A --> D[SUPABASE_SERVICE_ROLE_KEY]
    A --> E[E2E_USERNAME]
    A --> F[E2E_PASSWORD]
    
    B --> G[E2E Job env:]
    C --> G
    D --> G
    E --> G
    F --> G
    
    G --> H[Create .env.test file]
    H --> I[Playwright Config reads .env.test]
    I --> J[E2E Tests Execute]
    
    style A fill:#ffecb3
    style G fill:#e3f2fd
    style H fill:#f3e5f5
    style I fill:#e8f5e9
    style J fill:#c8e6c9
```

## Artifacts Generated

```mermaid
graph LR
    A[Workflow Execution] --> B[Unit Test Coverage]
    A --> C[Playwright HTML Report]
    A --> D[E2E Coverage if configured]
    
    B --> E[Retained 7 days]
    C --> E
    D --> E
    
    style A fill:#e3f2fd
    style B fill:#e1bee7
    style C fill:#e1bee7
    style D fill:#e1bee7
    style E fill:#fff9c4
```

## Timing & Parallelization

```
Time →

Lint:        [====] ~30s-1m
              ↓
Unit Tests:        [======] ~1-3m (parallel)
E2E Tests:         [==========] ~3-5m (parallel)
              ↓
Comment:                      [=] ~5s
                              
Total: ~4-7 minutes (depending on test suite size)
```

## Key Features

✅ **Sequential Linting** - Catches issues early before running expensive tests
✅ **Parallel Testing** - Unit and E2E tests run simultaneously to save time
✅ **Environment Isolation** - E2E tests use integration environment with dedicated secrets
✅ **Conditional Success Comment** - Only posts when ALL jobs pass
✅ **Artifact Collection** - Preserves coverage and test reports for review
✅ **Smart Browser Installation** - Only installs required Chromium browser
✅ **Proper Dependencies** - Uses npm ci for reproducible builds
