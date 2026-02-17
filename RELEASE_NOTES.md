# Release v1.0.0 - Last9 Deployment Marker Action

## 🎉 Initial Release

The Last9 Deployment Marker Action is a GitHub Action that sends deployment markers to Last9's Change Events API for observability tracking.

### ✨ Features

- **OAuth Token Management**: Automatic refresh token exchange with caching
- **Deployment Tracking**: Send start, stop, or both deployment markers
- **Automatic Context Collection**: Captures GitHub repository, commit, workflow, and actor information
- **Custom Attributes**: Add custom metadata to your deployment markers
- **Resilient**: Built-in retry logic with exponential backoff
- **Secure**: Automatic sensitive data redaction in logs
- **Type-Safe**: Written in TypeScript with strict mode

### 📦 Usage

```yaml
- name: Mark Deployment
  uses: last9/deployment-marker-action@v1
  with:
    refresh_token: ${{ secrets.LAST9_REFRESH_TOKEN }}
    org_slug: ${{ secrets.LAST9_ORG_SLUG }}
    event_state: stop
    custom_attributes: |
      {
        "environment": "production",
        "version": "${{ github.sha }}"
      }
```

### 🔧 Configuration

**Required:**
- `refresh_token` - Last9 API refresh token
- `org_slug` - Last9 organization slug

**Optional:**
- `event_state` - `start`, `stop`, or `both` (default: `stop`)
- `event_name` - Event name (default: `deployment`)
- `custom_attributes` - JSON object with custom metadata
- `include_github_attributes` - Include GitHub context (default: `true`)
- And more... see [README.md](README.md)

### 🧪 Testing

- 58 comprehensive tests with full coverage
- Integration tested with Last9 Change Events API
- TypeScript strict mode enabled

### 📚 Documentation

- [README.md](README.md) - Complete usage guide
- [Last9 Change Events Docs](https://last9.io/docs/change-events/)
- [Last9 API Docs](https://last9.io/docs/getting-started-with-api/)

### 🙏 Credits

Built with ❤️ by the Last9 team for the observability community.

### 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
