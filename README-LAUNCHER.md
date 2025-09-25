# Dashboard Launcher 🚀

Multiple ways to launch the dashboard with a single click!

## Option 1: macOS App (Recommended)

A **Dashboard Launcher.app** has been created on your Desktop.

**Simply double-click the app icon to launch the dashboard!**

## Option 2: Shell Command

Add this alias to your shell profile (~/.zshrc or ~/.bashrc):

```bash
alias dashboard='/Users/lefv/repos/lsh/launch-dashboard.sh'
```

Then use:
```bash
dashboard
```

## Option 3: Direct Script

Run the launcher script directly:
```bash
/Users/lefv/repos/lsh/launch-dashboard.sh
```

## How It Works

The launcher will:

1. **First try**: `mcli workflow dashboard run` (preferred method)
2. **Fallback**: Start the LSH pipeline service directly
3. **Auto-open** browser to the dashboard hub
4. **Smart detection** - won't start if already running

## Dashboard URLs

Once launched, these URLs will be available:

- **🏠 Hub**: http://localhost:3034/hub
- **📊 Pipeline**: http://localhost:3034/dashboard/
- **🤖 ML Dashboard**: http://localhost:3034/ml/dashboard
- **🔧 CI/CD**: http://localhost:3034/cicd/dashboard
- **💗 Health Check**: http://localhost:3034/health/all

## Stopping the Service

```bash
pkill -f 'node dist/pipeline/pipeline-service.js'
```

## Requirements

- **uv** package manager installed
- **mcli** command available (optional, will fallback to LSH service)
- **Node.js** and dependencies installed in LSH project

---

**🎉 Now you have a single-click solution to launch your entire dashboard suite!**