# Todo App - Desktop Edition

A local desktop task manager with context-based organization, calendar views, and recurring tasks. All data is stored locally on your computer.

## Features

- **Four Contexts**: Work, Rescue, Personal, and School
- **Calendar Dashboard**: Month view with task indicators
- **Daily Tasks**: Create, manage, and complete tasks for specific dates
- **Backlog System**: Track unscheduled tasks
- **Recurring Tasks**: Auto-generate tasks on schedules
- **Mass Entry**: Quick multi-task creation
- **Classes & Modules**: Track academic work (School context)
- **Dark/Light Theme**: Toggle in Settings
- **100% Local**: All data stored in your computer's localStorage

## Installation

### Option 1: Run Development Version

1. Install Node.js from https://nodejs.org (if not installed)
2. Open terminal/command prompt in this folder
3. Run:
   ```bash
   npm install
   npm start
   ```

### Option 2: Build Standalone App

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build for your platform:

   **Windows:**
   ```bash
   npm run build:win
   ```

   **macOS:**
   ```bash
   npm run build:mac
   ```

   **Linux:**
   ```bash
   npm run build:linux
   ```

3. Find the installer in the `dist/` folder
4. Install and run!

## Usage

### Context Switching
Click the context buttons (Work, Rescue, Personal, School) to switch between different task lists.

### Adding Tasks
1. Click a date on the calendar or go to Tasks view
2. Enter task title, notes (optional), and status
3. Click "Add Task"

### Recurring Tasks
1. Go to Recurring Tasks view
2. Enter task details and select frequency:
   - Daily (Mon-Fri)
   - Every Day
   - Weekly
   - Monthly
3. Tasks auto-generate on matching dates

### Classes (School Context)
1. Go to Classes view
2. Create classes with colors
3. Add modules with week assignments
4. Track completion status

## Data Storage

All data is stored in your browser's localStorage:
- Tasks organized by date and context
- Backlog tasks by context
- Recurring task definitions
- Class and module information
- Custom statuses and categories
- User settings (theme, etc.)

### Backing Up Data

To backup your data:
1. Open the app
2. Press `F12` to open Developer Tools
3. Go to Console tab
4. Run:
   ```javascript
   JSON.stringify(localStorage)
   ```
5. Copy the output and save to a file

### Restoring Data

To restore data:
1. Open the app
2. Press `F12` to open Developer Tools
3. Go to Console tab
4. Run (replace with your backed up data):
   ```javascript
   Object.assign(localStorage, JSON.parse('your-backup-data-here'))
   ```
5. Refresh the app

## Clearing Data

To start fresh:
1. Open Settings
2. Look for "Clear All Data" option
OR
1. Press `F12` → Console
2. Run: `localStorage.clear()`
3. Refresh

## System Requirements

- Windows 10/11, macOS 10.13+, or Linux
- 100MB disk space
- 512MB RAM

## Troubleshooting

**App won't start:**
- Make sure Node.js is installed
- Try `npm install` again

**Data disappeared:**
- Check if you cleared browser cache
- Data is stored locally - each user profile has its own data

**Build failed:**
- Make sure you have internet connection (downloads dependencies)
- Try deleting `node_modules` and running `npm install` again

## License

MIT - Free to use and modify

---

**Version**: 1.0.0
**Last Updated**: December 2024
