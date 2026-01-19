# Agent-Browser Integration

Auto Claude now supports **agent-browser** - a fast, AI-optimized headless browser automation tool built by Vercel Labs.

## What is Agent-Browser?

Agent-browser is a Rust-based CLI tool designed for AI-driven browser automation. It provides semantic element finding through accessibility trees and supports both headless and headed modes.

### Key Features

- **AI-Optimized**: Uses accessibility tree with refs (`@e1`, `@e2`) instead of brittle CSS selectors
- **Fast**: Rust core with Node.js fallback
- **Semantic Finding**: ARIA roles, labels, text content, placeholders
- **Multi-tab Support**: Isolated sessions for parallel test execution
- **Network Control**: Request interception and mocking
- **Screenshots & PDFs**: Visual capture and documentation generation

## Installation

```bash
# Install globally
npm install -g agent-browser

# Download Chromium
agent-browser install
```

Or use via npx (no installation):
```bash
npx agent-browser [command]
```

## Usage in Auto Claude

Agent-browser is automatically available to QA agents when:
1. Installed globally or available via npx
2. Project is detected as a web frontend

### Basic Commands

```bash
# Navigate to a page
agent-browser navigate http://localhost:3000

# Take a screenshot
agent-browser screenshot --name initial-state

# Get accessibility tree snapshot
agent-browser snapshot

# Click an element by ref
agent-browser click @e5

# Fill a form field
agent-browser fill @e3 "user@example.com"

# Type text
agent-browser type @e3 "password123"

# Execute JavaScript
agent-browser eval "document.title"
```

### Headed vs Headless

```bash
# Run with visible browser (default)
agent-browser navigate http://localhost:3000

# Run headless
agent-browser navigate http://localhost:3000 --headless
```

## Use Cases

### 1. **QA Validation**
Agents can test web UIs during the QA phase:
```bash
agent-browser navigate http://localhost:3000
agent-browser snapshot
agent-browser click @e10  # Click "Login" button
agent-browser fill @e3 "test@example.com"
agent-browser screenshot --name after-login
```

### 2. **Integration Setup**
Automate OAuth flows and API key setup:
```bash
agent-browser navigate https://dashboard.example.com/settings
agent-browser click @e15  # "Generate API Key" button
agent-browser screenshot --name api-key
```

### 3. **Documentation**
Generate screenshots for documentation:
```bash
agent-browser navigate http://localhost:3000/features
agent-browser screenshot --name feature-showcase
agent-browser screenshot --name mobile-view --device "iPhone 13"
```

### 4. **Research Phase**
Scrape documentation and examples:
```bash
agent-browser navigate https://docs.example.com/api
agent-browser snapshot
agent-browser get-text @e20  # Get code examples
```

## Workflow Integration

Agent-browser integrates naturally with Auto Claude's phases:

### Spec Research Phase
```python
# Agent can use agent-browser to:
# - Scrape API documentation
# - Find code examples
# - Verify package versions
```

### QA Validation Phase
```python
# Agent validates UI functionality:
# - Navigate to dev server
# - Test user interactions
# - Verify visual elements
# - Capture screenshots for QA report
```

### Post-Merge Testing
```python
# Agent tests deployed features:
# - Navigate to staging/production
# - Verify feature works
# - Generate visual regression tests
```

## Advantages Over Puppeteer

| Feature | Puppeteer MCP | Agent-Browser |
|---------|---------------|---------------|
| **Setup** | MCP server required | Simple CLI |
| **Speed** | Standard | Fast (Rust) |
| **AI Integration** | Standard selectors | Accessibility refs |
| **Semantic Finding** | Manual | Built-in (ARIA) |
| **Multi-tab** | Yes | Yes + isolated sessions |
| **Headed Mode** | Yes | Yes (default) |

## Example: Complete Login Test

```bash
# Start browser session
agent-browser navigate http://localhost:3000

# Get page structure
agent-browser snapshot

# Fill login form (using refs from snapshot)
agent-browser fill @e5 "test@example.com"
agent-browser fill @e7 "password123"
agent-browser click @e9  # Submit button

# Verify success
agent-browser snapshot  # Check for dashboard elements
agent-browser screenshot --name logged-in

# Read result
agent-browser eval "document.querySelector('.welcome-message').textContent"
```

## Security Allowlist

Agent-browser commands are automatically allowed when detected:
- `agent-browser`
- `npx` (for running without global install)

Commands are sandbox-safe and only interact with the browser, not the file system.

## Best Practices

### 1. **Use Semantic Finding**
```bash
# Good: Semantic ref-based selection
agent-browser snapshot
agent-browser click @e10

# Avoid: Brittle CSS selectors (use only when refs don't work)
```

### 2. **Capture State**
```bash
# Take snapshots before and after actions
agent-browser snapshot  # Before
agent-browser click @e5
agent-browser snapshot  # After
```

### 3. **Use Headed Mode for Debugging**
```bash
# Watch browser actions in real-time
agent-browser navigate http://localhost:3000
# Browser window opens, you can see what's happening
```

### 4. **Isolated Sessions for Parallel Tests**
```bash
# Session 1
agent-browser --session test-1 navigate http://localhost:3000

# Session 2 (parallel, no conflicts)
agent-browser --session test-2 navigate http://localhost:3001
```

## Troubleshooting

### "command not found: agent-browser"
```bash
# Install globally
npm install -g agent-browser

# Or use npx
npx agent-browser --help
```

### "Chromium not found"
```bash
# Download Chromium
agent-browser install
```

### "Element @e5 not found"
```bash
# Get fresh snapshot first
agent-browser snapshot
# Use the refs from the snapshot output
```

## Documentation

Full documentation: https://github.com/vercel-labs/agent-browser

## Integration Status

✅ Security allowlist configured
✅ Auto-detected for web projects
✅ Available to QA agents
✅ Supports both headed and headless modes
✅ Works with npx (no global install required)

## Next Steps

1. Install agent-browser: `npm install -g agent-browser`
2. Download Chromium: `agent-browser install`
3. Run a test: `agent-browser navigate http://localhost:3000`
4. Use in Auto Claude QA phase for automated UI validation
