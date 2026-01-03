# Auto-Claude Quick Start Guide

## One-Click Launch (Recommended)

### Option 1: Direct Launch
**Double-click** `START-AUTO-CLAUDE.bat` in the project root

This will automatically:
- ✓ Check for Python and Node.js
- ✓ Create Python virtual environment (if needed)
- ✓ Install all dependencies (if needed)
- ✓ Verify OAuth token setup
- ✓ Start Docker containers for Graphiti (if Docker is available)
- ✓ Launch the Auto-Claude UI development server

### Option 2: Desktop Shortcut
1. Right-click `Create-Shortcut.ps1`
2. Select **"Run with PowerShell"**
3. A shortcut will appear on your desktop
4. Double-click the desktop shortcut to launch

## First-Time Setup

### Prerequisites
- **Python 3.10+** - [Download here](https://www.python.org/downloads/)
  - ⚠️ Check "Add Python to PATH" during installation!
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - For cloning the repository
- **Docker Desktop** (Optional) - For Graphiti memory features

### OAuth Token Setup
On first launch, you'll be prompted to set up your Claude OAuth token:

1. Open a terminal and run:
   ```bash
   claude setup-token
   ```

2. Follow the browser prompts to authenticate

3. The launcher will create `auto-claude\.env` for you

4. Add your token to the file:
   ```
   CLAUDE_CODE_OAUTH_TOKEN=your-token-here
   ```

5. Run the launcher again

## Troubleshooting

### "Python environment not ready" in UI
1. Open Settings in the Auto-Claude UI
2. Check the "Auto Claude Path" setting
3. It should point to: `C:\git\Auto-Claude\auto-claude`
4. If incorrect, browse to select the correct path
5. Restart the UI

### "Failed to discover skills" error
✅ **FIXED!** This should now work automatically. If you still see this error:
1. Verify the `auto-claude/skills/__main__.py` file exists
2. Check that Python dependencies are installed
3. Restart the UI

### Node modules errors
If you see native module compilation errors:
1. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Select "Desktop development with C++" during installation
3. Delete `auto-claude-ui\node_modules`
4. Run the launcher again

### Docker containers not starting
- Make sure Docker Desktop is installed and running
- Graphiti memory is optional - the app works without it
- File-based memory will be used if Docker is unavailable

## What Gets Set Up

### Python Backend (`auto-claude/`)
- Virtual environment: `auto-claude/.venv/`
- Dependencies from: `auto-claude/requirements.txt`
- Key packages: `claude_agent_sdk`, `anthropic`, `httpx`, etc.

### Electron Frontend (`auto-claude-ui/`)
- Node modules: `auto-claude-ui/node_modules/`
- Dependencies from: `auto-claude-ui/package.json`
- Runs on: Development server (not production build)

### Docker Services (Optional)
- **FalkorDB** on port 6381 - Graph database for Graphiti
- **Graphiti MCP** on port 8001 - Memory context protocol

## Development vs Production

The `START-AUTO-CLAUDE.bat` launcher runs in **development mode**:
- Hot reload enabled
- Source maps available
- Console logs visible
- Faster startup (no build step)

For production deployment, use `launch.bat` instead (builds and packages the app).

## Using the UI

Once launched:
1. **Add a Project** - Click "Add Project" and select your code directory
2. **Create Tasks** - Use the Kanban board to create development tasks
3. **Run Specs** - Auto-Claude will build features autonomously
4. **Review & Merge** - Review changes in isolated worktrees before merging

## Need Help?

- Check the main [CLAUDE.md](CLAUDE.md) for detailed documentation
- Review [RELEASE.md](RELEASE.md) for release procedures
- File issues on GitHub if you encounter problems

## File Structure

```
Auto-Claude/
├── START-AUTO-CLAUDE.bat       ← One-click launcher (development)
├── Create-Shortcut.ps1         ← Creates desktop shortcut
├── launch.bat                  ← Production launcher (builds app)
├── auto-claude/                ← Python backend
│   ├── .venv/                  ← Python virtual environment
│   ├── requirements.txt        ← Python dependencies
│   ├── skills/                 ← Skill discovery module
│   │   └── __main__.py         ← Module entry point (NEW!)
│   └── ...
└── auto-claude-ui/             ← Electron frontend
    ├── node_modules/           ← Node dependencies
    ├── package.json            ← Node dependencies list
    └── ...
```

## Recent Fixes (2025-12-25)

✅ **Skills Discovery Fixed** - Added `__main__.py` to enable skill discovery module
✅ **Better Error Messages** - Python environment errors now show exact paths
✅ **One-Click Launcher** - Comprehensive setup and launch script
✅ **Desktop Shortcut** - Easy access from desktop

---

**Ready to build?** Double-click `START-AUTO-CLAUDE.bat` and start coding! 🚀
