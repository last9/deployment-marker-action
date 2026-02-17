# Last9 Deployment Marker GitHub Action

Send deployment markers to Last9's Change Events API to track deployments on your observability dashboards.

## Features

- 🚀 **Simple Integration** - Add deployment tracking in one step
- 📊 **Rich Metadata** - Automatically captures GitHub context (commit, workflow, actor, etc.)
- 🔄 **Automatic Retries** - Handles transient failures with exponential backoff
- 🔒 **Secure** - Automatic token masking in logs
- ⚡ **Fast** - Runs in Node 20 with minimal overhead
- 📝 **Flexible** - Support for custom attributes and multiple deployment stages

## Usage

### Basic Usage

Add this step to your workflow after deployment:

```yaml
- name: Mark deployment in Last9
  uses: last9/deployment-marker-action@v1
  with:
    refresh_token: ${{ secrets.LAST9_REFRESH_TOKEN }}
    org_slug: 'your-org-slug'
```

### Track Both Start and Stop Events

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Mark deployment start
        uses: last9/deployment-marker-action@v1
        with:
          refresh_token: ${{ secrets.LAST9_REFRESH_TOKEN }}
          org_slug: 'your-org-slug'
          event_state: 'start'

      - name: Deploy application
        run: |
          # Your deployment commands here
          ./deploy.sh

      - name: Mark deployment complete
        if: always()
        uses: last9/deployment-marker-action@v1
        with:
          refresh_token: ${{ secrets.LAST9_REFRESH_TOKEN }}
          org_slug: 'your-org-slug'
          event_state: 'stop'
```

### With Custom Attributes

```yaml
- name: Mark deployment
  uses: last9/deployment-marker-action@v1
  with:
    refresh_token: ${{ secrets.LAST9_REFRESH_TOKEN }}
    org_slug: 'your-org-slug'
    custom_attributes: |
      {
        "environment": "production",
        "version": "${{ github.ref_name }}",
        "service": "api-server",
        "team": "platform"
      }
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `refresh_token` | **Yes** | - | Last9 API refresh token (store in GitHub Secrets) |
| `org_slug` | **Yes** | - | Your Last9 organization slug |
| `api_base_url` | No | `https://app.last9.io` | Last9 API base URL |
| `event_name` | No | `deployment` | Name for the deployment event |
| `event_state` | No | `stop` | Event state: `start`, `stop`, or `both` |
| `data_source_name` | No | - | Last9 cluster/data source name |
| `include_github_attributes` | No | `true` | Include GitHub context attributes |
| `custom_attributes` | No | - | Custom attributes as JSON object |
| `max_retry_attempts` | No | `3` | Maximum number of retry attempts |
| `retry_backoff_ms` | No | `1000` | Initial retry backoff in milliseconds |
| `max_retry_backoff_ms` | No | `30000` | Maximum retry backoff in milliseconds |

## Outputs

| Output | Description |
|--------|-------------|
| `success` | Whether the deployment marker was sent successfully (`true`/`false`) |
| `start_timestamp` | ISO8601 timestamp of start event (if sent) |
| `stop_timestamp` | ISO8601 timestamp of stop event (if sent) |

## Setup

### 1. Get Your Last9 API Token

1. Log in to [Last9](https://app.last9.io)
2. Go to **Settings** → **API Access**
3. Create a new **Refresh Token** with **Write** scope
4. Copy the token (you won't be able to see it again!)

### 2. Add Token to GitHub Secrets

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `LAST9_REFRESH_TOKEN`
4. Value: Paste your Last9 refresh token
5. Click **Add secret**

### 3. Add Action to Your Workflow

See [Usage](#usage) examples above.

## GitHub Context Attributes

When `include_github_attributes` is `true` (default), the following attributes are automatically included:

- `repository` - Repository full name (e.g., `owner/repo`)
- `service_name` - Repository name (e.g., `repo`)
- `workflow` - Workflow name
- `run_id` - Workflow run ID
- `run_number` - Workflow run number
- `run_attempt` - Workflow run attempt number
- `commit_sha` - Commit SHA
- `ref` - Git ref (branch or tag)
- `commit_message` - Commit message
- `actor` - GitHub username who triggered the workflow
- `event_name` - GitHub event that triggered the workflow

## Error Handling

The action automatically retries transient failures (network errors, 5xx responses) with exponential backoff. If all retries fail, the action will fail the workflow by default.

To prevent deployment failures from blocking your workflow, set `if: always()`:

```yaml
- name: Mark deployment
  if: always()
  uses: last9/deployment-marker-action@v1
  with:
    refresh_token: ${{ secrets.LAST9_REFRESH_TOKEN }}
    org_slug: 'your-org-slug'
```

## Troubleshooting

### "TOKEN_EXCHANGE_ERROR: Failed to exchange refresh token"

- **Cause:** Invalid or expired refresh token
- **Solution:** Generate a new refresh token in Last9 and update the GitHub Secret

### "API_ERROR: API request failed with status 404"

- **Cause:** Invalid `org_slug`
- **Solution:** Verify your organization slug in Last9 settings

### "NETWORK_ERROR: Connection failed"

- **Cause:** Temporary network issue or Last9 API unavailable
- **Solution:** The action will automatically retry. If it persists, check Last9 status page

## Examples

### Kubernetes Deployment

```yaml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Mark deployment start
        uses: last9/deployment-marker-action@v1
        with:
          refresh_token: ${{ secrets.LAST9_REFRESH_TOKEN }}
          org_slug: 'acme'
          event_state: 'start'
          custom_attributes: |
            {
              "environment": "production",
              "namespace": "default",
              "service": "api"
            }

      - name: Deploy to Kubernetes
        run: kubectl apply -f k8s/

      - name: Mark deployment complete
        if: always()
        uses: last9/deployment-marker-action@v1
        with:
          refresh_token: ${{ secrets.LAST9_REFRESH_TOKEN }}
          org_slug: 'acme'
          event_state: 'stop'
```

### Multi-Environment Deployment

```yaml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - name: Deploy
        run: ./deploy.sh ${{ inputs.environment }}

      - name: Mark deployment in Last9
        uses: last9/deployment-marker-action@v1
        with:
          refresh_token: ${{ secrets.LAST9_REFRESH_TOKEN }}
          org_slug: 'acme'
          custom_attributes: |
            {
              "environment": "${{ inputs.environment }}",
              "version": "${{ github.sha }}"
            }
```

## Contributing

Contributions are welcome! Please open an issue or pull request.

## License

MIT

## Support

- 📖 [Last9 Documentation](https://last9.io/docs/change-events/)
- 💬 [GitHub Issues](https://github.com/last9/deployment-marker-action/issues)
- 📧 [Last9 Support](mailto:support@last9.io)
