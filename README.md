# Forma

Publish Markdown documentation to Confluence. Keep your docs in Git, publish to Confluence automatically.

## Features

- Directory structure becomes Confluence page hierarchy
- Multi-root mapping: publish multiple directories to different Confluence parents
- Idempotent updates via content properties (not title-based)
- Local lint command catches issues before publish
- GitHub Action for CI/CD integration
- Relative link conversion between pages
- Attachment upload (images, PDFs)
- Mermaid diagram support (auto-detects macro availability)

## Installation

```bash
npm install -g forma-cli
```

## Usage

```bash
# Lint locally (no API calls)
forma lint

# Preview changes
forma plan

# Publish to Confluence
forma publish
```

## Configuration

Create `.confluence-publish.yml` in your repo root:

```yaml
version: 1

confluence:
  baseUrl: "https://YOURDOMAIN.atlassian.net/wiki"
  spaceKey: "DOCS"

mappings:
  - localRoot: "docs/architecture"
    parentPageTitle: "Architecture"
  - localRoot: "docs/guides"
    parentPageTitle: "Guides"

publish:
  include: ["**/*.md"]
  exclude: ["**/node_modules/**", "**/.git/**"]
```

## GitHub Action

```yaml
- uses: kof22/forma@v1
  env:
    CONFLUENCE_EMAIL: ${{ secrets.CONFLUENCE_EMAIL }}
    CONFLUENCE_API_TOKEN: ${{ secrets.CONFLUENCE_API_TOKEN }}
```

## Project Structure

```
packages/
  publisher/    # Core library
  cli/          # CLI (forma command)
action/         # GitHub Action
```

## License

MIT
