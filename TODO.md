# Forma - Remaining Work

## Status Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Repo skeleton | DONE | Monorepo structure created |
| Phase 1: Confluence client | DONE | Auth, CRUD, attachments, labels, properties |
| Phase 2: Tree builder | DONE | Glob matching, title extraction, hierarchy |
| Phase 3: Page creation | DONE | Integrated into Publisher |
| Phase 4: Markdown converter | DONE | Basic conversion working |
| Phase 5: Update/diff | DONE | Content hash comparison |
| Phase 6: GitHub Action | TODO | action.yml exists, needs packaging |
| Phase 7: Hardening | TODO | Edge cases, error handling |

---

## CLI Implementation

### Config Loading
- [ ] Load `.confluence-publish.yml` from repo root
- [ ] Support `.json` alternative
- [ ] Schema validation (consider zod)
- [ ] Env var substitution in config values
- [ ] CLI option overrides (--config, --mapping, --space, etc.)

### Commands

#### `forma publish` (default)
- [ ] Wire up to Publisher class
- [ ] Read credentials from env vars
- [ ] Pretty output formatting
- [ ] Exit code 0/1/2/3 based on result
- [ ] Summary output for CI

#### `forma lint`
- [ ] Implement Linter class with all checks:
  - [ ] Config file syntax and schema validation
  - [ ] Local directories exist check
  - [ ] Duplicate page titles within same parent (fail)
  - [ ] Broken relative links to other .md files (fail)
  - [ ] Missing referenced attachments/images (fail)
  - [ ] Cross-mapping links (warn only)
  - [ ] Title length > 255 chars (fail)
  - [ ] Forbidden characters in titles (fail)
  - [ ] Markdown syntax errors (fail)
  - [ ] Files matching exclude patterns (info)
- [ ] Clear error messages with file:line format
- [ ] Exit 0 if warnings only, exit 1 if errors

#### `forma plan`
- [ ] Dry-run showing what would change
- [ ] Connect to Confluence to check existing pages
- [ ] Show create/update/unchanged counts
- [ ] No mutations

#### `forma validate`
- [ ] Config-only validation (no file system checks)
- [ ] Quick syntax check

#### `forma render`
- [ ] Convert markdown to storage format
- [ ] Output to stdout or --output directory
- [ ] Useful for debugging conversion issues

---

## Confluence Client Enhancements

### Retry/Backoff
- [ ] Exponential backoff on 429 (rate limit)
- [ ] Retry on transient 5xx errors
- [ ] Configurable max retries

### Mermaid Auto-Detection
- [ ] Query Confluence for Mermaid macro availability
- [ ] Cache result per session
- [ ] Fallback to code block if unavailable

### Publish Metadata
- [ ] Add commit SHA as page property
- [ ] Add publish timestamp as page property
- [ ] Include in page footer (optional)

---

## Markdown Converter Improvements

### Relative Link Resolution
- [ ] Convert `./other.md` links to Confluence page links
- [ ] Requires two-pass: build page map first, then render
- [ ] Handle anchor links within same page

### Cross-Mapping Link Handling
- [ ] Detect links that cross mapping boundaries
- [ ] Emit warning (not error)
- [ ] Convert to plain text or leave as-is

### Additional Markdown Features
- [ ] Nested lists
- [ ] Task lists (checkboxes)
- [ ] Definition lists
- [ ] Footnotes
- [ ] Admonitions/callouts to Confluence panels

### Frontmatter Handling
- [ ] Extract `title` field
- [ ] Extract `labels` array
- [ ] Strip from rendered output

---

## Tree Builder Improvements

### Parent Resolution
- [ ] Handle deeply nested directories
- [ ] Create intermediate folder pages if needed
- [ ] Respect folderIndexBehavior setting

### Ordering
- [ ] Verify numeric prefix sorting works correctly
- [ ] Ensure README/index files come first

---

## Publisher Improvements

### Error Handling
- [ ] Fail-all on any error (per requirements)
- [ ] Collect all errors before failing
- [ ] Clear error messages

### Idempotency
- [ ] Ensure forma-repo-path property is always set
- [ ] Handle orphaned pages (pages without property)
- [ ] Skip unchanged pages correctly

### Deletion/Archival
- [ ] Implement allowDelete option
- [ ] Archive/trash pages not in repo
- [ ] Safety guard: only within parent subtree
- [ ] Require deleteConfirmationToken

---

## GitHub Action

### Packaging
- [ ] Build with ncc for single-file output
- [ ] action.yml inputs/outputs
- [ ] Read secrets from env vars
- [ ] Write job summary

### Workflow Example
- [ ] Create example workflow file
- [ ] Document required secrets
- [ ] Path filtering for efficiency

---

## Testing

### Unit Tests
- [ ] Title generation tests
- [ ] Glob matching tests
- [ ] Markdown conversion snapshot tests
- [ ] Tree building tests

### Integration Tests
- [ ] Mock Confluence API (msw)
- [ ] Real Confluence sandbox (gated by env var)

### Fixtures
- [ ] fixtures/simple-docs/
- [ ] fixtures/attachments/
- [ ] fixtures/relative-links/
- [ ] fixtures/mermaid/

---

## Documentation

### README
- [x] Basic README exists
- [ ] Installation instructions
- [ ] Quick start guide
- [ ] Configuration reference

### Config Reference
- [ ] Document all config options
- [ ] Examples for common scenarios

---

## Security

### Secret Scanning
- [ ] Default exclude patterns for secrets
- [ ] Warn if .env or *.pem would be published
- [ ] Never log API tokens

---

## Polish

### Logging
- [ ] Structured logging
- [ ] Log levels (debug/info/warn/error)
- [ ] Diff summary option

### Performance
- [ ] Parallel page updates (rate-limit aware)
- [ ] Skip unchanged attachments (hash check)

---

## Priority Order (Recommended)

1. **CLI config loading** - needed to run without hardcoded values
2. **forma lint** - catches errors before publish
3. **forma publish** - main command
4. **Relative link resolution** - improves page interconnection
5. **GitHub Action packaging** - CI/CD integration
6. **Unit tests** - stability
7. **Documentation** - usability
