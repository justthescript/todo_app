# Context Task Manager

A comprehensive, responsive to-do web application with context-based task management, calendar views, recurring tasks, and backlog support. Built with vanilla HTML, CSS, and JavaScript, designed to be hosted on GitHub Pages.

## Features

### 🎯 Core Features

- **Three Context System**: Organize tasks across Work, Rescue, and Personal contexts
- **Calendar Dashboard**: Month view calendar with task indicators and easy day selection
- **Daily Task Management**: Create, edit, prioritize, and manage tasks for specific dates
- **Backlog System**: Maintain a separate backlog of unscheduled tasks
- **Recurring Tasks**: Define tasks that automatically generate on specific schedules
- **Mass Entry**: Quick entry interface for adding multiple tasks at once
- **Focus Mode**: See today's urgent and priority tasks at a glance

### 📋 Task Features

- Task status options: Urgent, Today, Leisure, Improvements
- Optional notes/descriptions for each task
- Completion tracking with visual feedback
- Priority controls (move tasks up/down)
- Defer functionality with quick options:
  - Tomorrow
  - Next week (Monday)
  - End of week (Friday)
  - Custom date selection
- Overdue task indicators

### 🔍 Organization Tools

- Search tasks by text
- Filter by status
- Hide completed tasks toggle
- Backlog assignment to specific dates
- Task statistics for each context

### 🔄 Recurring Tasks

Support for multiple frequency patterns:
- Daily (Monday-Friday)
- Every day
- Weekly on specific days
- Monthly on specific dates (1st, 15th, last day)
- Monthly on specific weekdays (1st Monday, 1st Friday, etc.)

### 🎨 User Experience

- Clean, modern interface
- Light and dark theme support
- Responsive mobile-friendly design
- Visual indicators on calendar:
  - Tasks present on a day
  - Urgent tasks indicator
  - Today highlight
  - Selected day highlight
- Keyboard accessibility (Enter to submit)

## Getting Started

### Local Usage

1. Download all files to a folder:
   - `index.html`
   - `styles.css`
   - `script.js`

2. Open `index.html` in your web browser

3. Start adding tasks!

### GitHub Pages Deployment

1. Create a new repository on GitHub

2. Upload the three files to your repository

3. Go to Settings > Pages

4. Under "Source", select the branch (usually `main` or `master`)

5. Click "Save"

6. Your app will be available at: `https://yourusername.github.io/repository-name/`

## How to Use

### Switching Contexts

Use the context buttons at the top (Work, Rescue, Personal) to switch between different task contexts. All views respect the currently selected context.

### Managing Daily Tasks

1. **View Tasks**: Click any day on the calendar to see tasks for that day
2. **Add Task**: Fill in the title, optional notes, select a status, and click "Add Task"
3. **Complete Task**: Check the checkbox next to a task
4. **Defer Task**: Click "Defer" and choose a new date
5. **Delete Task**: Click "Delete" to remove a task
6. **Prioritize**: Use ↑↓ buttons to reorder tasks

### Using the Backlog

1. Navigate to the "Backlog" view
2. Add tasks without specific dates
3. Use "Assign to Date" to schedule backlog items
4. Backlog tasks use different status options:
   - Improvements
   - Work Quality
   - Work Reduction
   - Revenue Increase

### Setting Up Recurring Tasks

1. Navigate to "Recurring Tasks"
2. Enter a task title and select status
3. Choose a frequency pattern
4. Click "Add Recurring Task"
5. Tasks will automatically generate on matching dates
6. Toggle tasks active/inactive as needed

### Mass Entry

1. Navigate to "Mass Entry"
2. Fill in the table rows with task information
3. Optionally specify a start date (leave blank for backlog)
4. Click "Save All" to create all tasks at once

### Search and Filters

- Use the search box to find tasks by text
- Use the status filter to show specific types of tasks
- Toggle "Hide completed" to focus on active tasks

## Data Storage

All data is stored locally in your browser's localStorage:

- **Tasks**: Organized by date and context
- **Backlog**: Organized by context
- **Recurring Tasks**: Definitions and generation tracking
- **Settings**: Theme preference

### Clearing Data

To start fresh, open your browser's developer console (F12) and run:

```javascript
localStorage.clear();
```

Then refresh the page.

## Browser Compatibility

Works best in modern browsers:
- Chrome/Edge (version 90+)
- Firefox (version 88+)
- Safari (version 14+)

## Tips and Tricks

1. **Stay Organized**: Use contexts to separate work and personal life
2. **Morning Routine**: Check the Focus panel each morning for urgent tasks
3. **Weekly Planning**: Use the calendar view to plan your week ahead
4. **Backlog Management**: Review your backlog regularly and assign tasks to specific dates
5. **Recurring Tasks**: Set up recurring tasks for habits and regular responsibilities
6. **Theme Switching**: Click the moon/sun icon to toggle between light and dark mode

## Keyboard Shortcuts

- **Enter** in task title field: Add task
- **Tab** to navigate between fields

## Troubleshooting

**Tasks not appearing?**
- Make sure you're in the correct context (Work/Rescue/Personal)
- Check that the correct date is selected
- Verify filters aren't hiding your tasks

**Recurring tasks not generating?**
- Make sure the task is set to "Active"
- Tasks generate for the current month and 2 months ahead
- Refresh the page to trigger generation

**Lost data after closing browser?**
- Check that your browser allows localStorage
- Some private/incognito modes may not persist data
- Try a different browser

## Technical Details

- **Framework**: None (Vanilla JavaScript)
- **Storage**: localStorage API
- **Styling**: Custom CSS with CSS Variables
- **Responsive**: Mobile-first design with flexbox and grid
- **File Size**: ~45KB total (uncompressed)

## Future Enhancement Ideas

- Export/import data as JSON
- Task categories and tags
- Subtasks and checklists
- Time tracking
- Task templates
- Collaboration features
- Cloud sync
- Notifications/reminders

## License

Free to use and modify for personal and commercial projects.

## Credits

Built as a comprehensive task management solution for organizing life across multiple contexts.

---

**Version**: 1.0.0  
**Last Updated**: December 2024

Enjoy staying organized! 🎯
