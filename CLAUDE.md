# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js application that automatically updates Slack profile status with Claude usage cost savings. The app runs `npx ccusage@latest monthly --json` every minute, calculates savings against Claude Max subscription ($200), and updates the user's Slack profile status text.

## Development Commands

```bash
# Install dependencies
npm install

# Run Slack Profile Updater
npm start

# Run Gacha
npm run gacha

# Manage messages
npm run message:list
npm run message:use <message-file>

# Test ccusage command manually
npx ccusage@latest monthly --json
```

## Architecture

### Directory Structure
```
/
├── src/
│   ├── slack/         # Slack profile updater
│   └── gacha/         # Message gacha system
├── config/            # Configuration files
├── messages/          # Message templates
├── data/              # Runtime data
├── scripts/           # Entry point scripts
└── docs/              # Documentation
```

### Core Components
- **src/slack/index.js**: Main Slack updater with three core functions:
  - `getCCUsage()`: Executes ccusage command and parses JSON response
  - `updateSlackProfile()`: Updates Slack profile via users.profile.set API
  - `updateCostInfo()`: Orchestrates the update process
- **src/gacha/**: Gacha system for generating message variations
- **Message Management**: Dynamic message file selection without overwriting
- **Scheduling**: Uses node-cron for 1-minute intervals
- **Configuration**: Environment variables via dotenv (.env file)
- **Dependencies**: axios (HTTP requests), node-cron (scheduling), dotenv (config)

## Environment Variables

- `SLACK_TOKEN`: Required Slack User OAuth Token with `users.profile:write` scope