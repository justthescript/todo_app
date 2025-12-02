/**
 * ============================================
 * CONTEXT TASK MANAGER - Main JavaScript
 * ============================================
 * 
 * DATA STRUCTURE IN LOCALSTORAGE:
 * 
 * 1. tasks: Object with date keys (YYYY-MM-DD format)
 *    {
 *      "2024-12-15": {
 *        "work": [{ id, title, notes, status, completed, priority }],
 *        "rescue": [...],
 *        "personal": [...],
 *        "school": [...]
 *      }
 *    }
 *
 * 2. backlog: Object with context keys
 *    {
 *      "work": [{ id, title, notes, status }],
 *      "rescue": [...],
 *      "personal": [...],
 *      "school": [...]
 *    }
 * 
 * 3. recurringTasks: Array of recurring task definitions
 *    [{ id, title, context, status, frequency, active, generatedDates }]
 * 
 * 4. settings: Object for user preferences
 *    { theme: 'light' | 'dark' }
 */

// ============================================
// GLOBAL STATE
// ============================================

let currentContext = 'work'; // work | rescue | personal | school
let currentView = 'dashboard'; // dashboard | tasks | backlog | recurring | mass-entry
let currentDate = new Date();
let selectedDate = null;
let currentMonth = new Date();
let tasksViewDate = null; // Date currently being viewed in Tasks page
let deferringTask = null; // Task being deferred
let assigningBacklogTask = null; // Backlog task being assigned

// ============================================
// DATA MANAGEMENT
// ============================================

/**
 * Get all tasks from localStorage
 */
function getTasks() {
    const tasksJson = localStorage.getItem('tasks');
    return tasksJson ? JSON.parse(tasksJson) : {};
}

/**
 * Save tasks to localStorage
 */
function saveTasks(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

/**
 * Get tasks for a specific date and context
 */
function getTasksForDate(dateStr, context) {
    const tasks = getTasks();
    if (!tasks[dateStr] || !tasks[dateStr][context]) {
        return [];
    }
    return tasks[dateStr][context];
}

/**
 * Save tasks for a specific date and context
 */
function saveTasksForDate(dateStr, context, taskList) {
    const tasks = getTasks();
    if (!tasks[dateStr]) {
        tasks[dateStr] = {};
    }
    tasks[dateStr][context] = taskList;
    saveTasks(tasks);
}

/**
 * Get backlog tasks
 */
function getBacklog() {
    const backlogJson = localStorage.getItem('backlog');
    return backlogJson ? JSON.parse(backlogJson) : { work: [], rescue: [], personal: [], school: [] };
}

/**
 * Save backlog tasks
 */
function saveBacklog(backlog) {
    localStorage.setItem('backlog', JSON.stringify(backlog));
}

/**
 * Get recurring tasks
 */
function getRecurringTasks() {
    const recurringJson = localStorage.getItem('recurringTasks');
    return recurringJson ? JSON.parse(recurringJson) : [];
}

/**
 * Save recurring tasks
 */
function saveRecurringTasks(recurring) {
    localStorage.setItem('recurringTasks', JSON.stringify(recurring));
}

/**
 * Get settings
 */
function getSettings() {
    const settingsJson = localStorage.getItem('settings');
    return settingsJson ? JSON.parse(settingsJson) : { theme: 'light' };
}

/**
 * Save settings
 */
function saveSettings(settings) {
    localStorage.setItem('settings', JSON.stringify(settings));
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Sort tasks by priority (Urgent > Today > Leisure > Improvements) then by time added
 */
function sortTasks(tasks) {
    const priorityOrder = {
        'urgent': 0,
        'today': 1,
        'leisure': 2,
        'improvements': 3
    };

    return tasks.sort((a, b) => {
        // First sort by priority
        const priorityA = priorityOrder[a.status] !== undefined ? priorityOrder[a.status] : 999;
        const priorityB = priorityOrder[b.status] !== undefined ? priorityOrder[b.status] : 999;

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        // Then sort by createdAt timestamp (older first)
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        return timeA - timeB;
    });
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Check if a date is in the past (excluding today)
 */
function isPastDate(dateStr) {
    const date = parseDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
}

/**
 * Check if a date is today
 */
function isToday(dateStr) {
    const today = formatDate(new Date());
    return dateStr === today;
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Load theme
    const settings = getSettings();
    if (settings.theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        document.querySelector('.theme-icon').textContent = '☀️';
    }

    // Generate recurring tasks for current month
    generateRecurringTasks();

    // Set initial selected date to today
    selectedDate = formatDate(currentDate);
    tasksViewDate = formatDate(currentDate);

    // Render initial views
    renderCalendar();
    renderDayTasks();
    renderFocusPanel();
    renderStats();

    // Setup event listeners
    setupEventListeners();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    
    // Context selector
    document.querySelectorAll('.context-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentContext = e.target.dataset.context;
            updateContextButtons();
            refreshCurrentView();
        });
    });
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentView = e.target.dataset.view;
            updateNavButtons();
            switchView(currentView);
        });
    });
    
    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });
    
    // Day tasks
    document.getElementById('addTaskBtn').addEventListener('click', addTask);
    document.getElementById('newTaskTitle').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    document.getElementById('hideCompletedToggle').addEventListener('change', renderDayTasks);
    document.getElementById('taskSearch').addEventListener('input', renderDayTasks);
    document.getElementById('statusFilter').addEventListener('change', renderDayTasks);

    // Tasks page navigation
    document.getElementById('prevDayBtn').addEventListener('click', () => {
        const date = parseDate(tasksViewDate);
        date.setDate(date.getDate() - 1);
        tasksViewDate = formatDate(date);
        renderTasksView();
    });

    document.getElementById('nextDayBtn').addEventListener('click', () => {
        const date = parseDate(tasksViewDate);
        date.setDate(date.getDate() + 1);
        tasksViewDate = formatDate(date);
        renderTasksView();
    });

    // Tasks page - add task
    document.getElementById('tasksAddTaskBtn').addEventListener('click', addTaskFromTasksPage);
    document.getElementById('tasksNewTaskTitle').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTaskFromTasksPage();
    });
    
    // Backlog
    document.getElementById('addBacklogTaskBtn').addEventListener('click', addBacklogTask);
    
    // Recurring tasks
    document.getElementById('addRecurringTaskBtn').addEventListener('click', addRecurringTask);
    
    // Mass entry
    document.getElementById('addMassEntryRow').addEventListener('click', addMassEntryRow);
    document.getElementById('saveMassEntryBtn').addEventListener('click', saveMassEntry);
    
    // Defer modal
    document.getElementById('closeDeferModal').addEventListener('click', closeDeferModal);
    document.querySelectorAll('.defer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deferToQuickOption(e.target.dataset.defer);
        });
    });
    document.getElementById('deferCustomDateBtn').addEventListener('click', deferToCustomDate);
    
    // Assign date modal
    document.getElementById('closeAssignModal').addEventListener('click', closeAssignModal);
    document.getElementById('assignDateBtn').addEventListener('click', assignBacklogTaskToDate);
}

// ============================================
// THEME
// ============================================

function toggleTheme() {
    const settings = getSettings();
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    settings.theme = newTheme;
    saveSettings(settings);
    
    document.body.setAttribute('data-theme', newTheme);
    document.querySelector('.theme-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// ============================================
// VIEW MANAGEMENT
// ============================================

function updateContextButtons() {
    document.querySelectorAll('.context-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.context === currentContext);
    });
}

function updateNavButtons() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === currentView);
    });
}

function switchView(view) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Show selected view
    const viewMap = {
        'dashboard': 'dashboardView',
        'tasks': 'tasksView',
        'backlog': 'backlogView',
        'recurring': 'recurringView',
        'mass-entry': 'massEntryView'
    };

    document.getElementById(viewMap[view]).classList.add('active');

    // Render view content
    if (view === 'tasks') {
        renderTasksView();
    } else if (view === 'backlog') {
        renderBacklog();
    } else if (view === 'recurring') {
        renderRecurringTasks();
    } else if (view === 'mass-entry') {
        renderMassEntry();
    }
}

function refreshCurrentView() {
    if (currentView === 'dashboard') {
        renderCalendar();
        renderDayTasks();
        renderFocusPanel();
        renderStats();
    } else if (currentView === 'tasks') {
        renderTasksView();
    } else if (currentView === 'backlog') {
        renderBacklog();
    } else if (currentView === 'recurring') {
        renderRecurringTasks();
    }
}

// ============================================
// CALENDAR
// ============================================

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const monthTitle = document.getElementById('currentMonth');
    
    // Set month title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    monthTitle.textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendar.appendChild(header);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Add previous month days
    const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay.getDate() - i;
        const dayElement = createCalendarDay(day, true, -1);
        calendar.appendChild(dayElement);
    }
    
    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createCalendarDay(day, false, 0);
        calendar.appendChild(dayElement);
    }
    
    // Add next month days
    const remainingCells = 42 - (startingDayOfWeek + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        const dayElement = createCalendarDay(day, true, 1);
        calendar.appendChild(dayElement);
    }
}

function createCalendarDay(day, otherMonth, monthOffset) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    
    let date;
    if (monthOffset === -1) {
        date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, day);
    } else if (monthOffset === 1) {
        date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, day);
    } else {
        date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    }
    
    const dateStr = formatDate(date);
    
    if (otherMonth) {
        dayElement.classList.add('other-month');
    }
    
    if (isToday(dateStr)) {
        dayElement.classList.add('today');
    }
    
    if (selectedDate === dateStr) {
        dayElement.classList.add('selected');
    }
    
    // Day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;
    dayElement.appendChild(dayNumber);
    
    // Indicators
    const indicators = document.createElement('div');
    indicators.className = 'calendar-indicators';
    
    const tasks = getTasksForDate(dateStr, currentContext);
    if (tasks.length > 0) {
        const hasTasksIndicator = document.createElement('div');
        hasTasksIndicator.className = 'calendar-indicator has-tasks';
        indicators.appendChild(hasTasksIndicator);
    }
    
    const hasUrgent = tasks.some(t => t.status === 'urgent' && !t.completed);
    if (hasUrgent) {
        const urgentIndicator = document.createElement('div');
        urgentIndicator.className = 'calendar-indicator has-urgent';
        indicators.appendChild(urgentIndicator);
    }
    
    dayElement.appendChild(indicators);

    // Click handler
    dayElement.addEventListener('click', () => {
        // Navigate to Tasks view with this date
        tasksViewDate = dateStr;
        currentView = 'tasks';
        updateNavButtons();
        switchView('tasks');
    });

    return dayElement;
}

// ============================================
// DAY TASKS
// ============================================

function renderDayTasks() {
    if (!selectedDate) return;

    const titleElement = document.getElementById('selectedDayTitle');
    const tasksList = document.getElementById('dayTasksList');

    // Update title
    const date = parseDate(selectedDate);
    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    titleElement.textContent = dateStr;

    // Get tasks and sort them
    let tasks = getTasksForDate(selectedDate, currentContext);
    sortTasks(tasks);

    // Apply filters
    const hideCompleted = document.getElementById('hideCompletedToggle').checked;
    const searchQuery = document.getElementById('taskSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    tasks = tasks.filter(task => {
        if (hideCompleted && task.completed) return false;
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery) &&
            !task.notes.toLowerCase().includes(searchQuery)) return false;
        if (statusFilter !== 'all' && task.status !== statusFilter) return false;
        return true;
    });

    // Render tasks
    if (tasks.length === 0) {
        tasksList.innerHTML = '<div class="empty-state"><p>No tasks for this day</p></div>';
        return;
    }

    tasksList.innerHTML = '';
    tasks.forEach((task, index) => {
        const taskElement = createTaskElement(task, index, selectedDate);
        tasksList.appendChild(taskElement);
    });
}

function createTaskElement(task, index, dateStr) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.status}`;
    
    if (task.completed) {
        taskElement.classList.add('completed');
    }
    
    if (isPastDate(dateStr) && !task.completed) {
        taskElement.classList.add('overdue');
    }
    
    // Header
    const header = document.createElement('div');
    header.className = 'task-header';
    
    const titleGroup = document.createElement('div');
    titleGroup.className = 'task-title-group';
    
    const titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => toggleTaskComplete(dateStr, index));
    
    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;
    
    titleContainer.appendChild(checkbox);
    titleContainer.appendChild(title);
    titleGroup.appendChild(titleContainer);
    
    if (task.notes) {
        const notes = document.createElement('div');
        notes.className = 'task-notes';
        notes.textContent = task.notes;
        titleGroup.appendChild(notes);
    }
    
    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge ${task.status}`;
    statusBadge.textContent = task.status;
    titleGroup.appendChild(statusBadge);
    
    header.appendChild(titleGroup);
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    
    // Priority controls
    const priorityControls = document.createElement('div');
    priorityControls.className = 'priority-controls';
    
    const upBtn = document.createElement('button');
    upBtn.className = 'priority-btn';
    upBtn.textContent = '↑';
    upBtn.title = 'Move up';
    upBtn.addEventListener('click', () => moveTask(dateStr, index, -1));
    if (index === 0) upBtn.disabled = true;
    
    const downBtn = document.createElement('button');
    downBtn.className = 'priority-btn';
    downBtn.textContent = '↓';
    downBtn.title = 'Move down';
    downBtn.addEventListener('click', () => moveTask(dateStr, index, 1));
    
    priorityControls.appendChild(upBtn);
    priorityControls.appendChild(downBtn);
    actions.appendChild(priorityControls);
    
    const deferBtn = document.createElement('button');
    deferBtn.textContent = 'Defer';
    deferBtn.addEventListener('click', () => openDeferModal(task, dateStr, index));
    actions.appendChild(deferBtn);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteTask(dateStr, index));
    actions.appendChild(deleteBtn);
    
    header.appendChild(actions);
    taskElement.appendChild(header);
    
    return taskElement;
}

function addTask() {
    const titleInput = document.getElementById('newTaskTitle');
    const notesInput = document.getElementById('newTaskNotes');
    const statusSelect = document.getElementById('newTaskStatus');

    const title = titleInput.value.trim();
    if (!title) return;

    const task = {
        id: generateId(),
        title: title,
        notes: notesInput.value.trim(),
        status: statusSelect.value,
        completed: false,
        priority: 0,
        createdAt: Date.now()
    };

    const tasks = getTasksForDate(selectedDate, currentContext);
    tasks.push(task);
    sortTasks(tasks);
    saveTasksForDate(selectedDate, currentContext, tasks);

    // Clear inputs
    titleInput.value = '';
    notesInput.value = '';

    // Re-render
    renderDayTasks();
    renderCalendar();
    renderFocusPanel();
    renderStats();
}

function toggleTaskComplete(dateStr, index) {
    const tasks = getTasksForDate(dateStr, currentContext);
    tasks[index].completed = !tasks[index].completed;
    saveTasksForDate(dateStr, currentContext, tasks);
    renderDayTasks();
    renderCalendar();
    renderFocusPanel();
    renderStats();
}

function moveTask(dateStr, index, direction) {
    const tasks = getTasksForDate(dateStr, currentContext);
    const newIndex = index + direction;
    
    if (newIndex < 0 || newIndex >= tasks.length) return;
    
    // Swap tasks
    [tasks[index], tasks[newIndex]] = [tasks[newIndex], tasks[index]];
    saveTasksForDate(dateStr, currentContext, tasks);
    renderDayTasks();
}

function deleteTask(dateStr, index) {
    if (!confirm('Delete this task?')) return;
    
    const tasks = getTasksForDate(dateStr, currentContext);
    tasks.splice(index, 1);
    saveTasksForDate(dateStr, currentContext, tasks);
    renderDayTasks();
    renderCalendar();
    renderFocusPanel();
    renderStats();
}

// ============================================
// DEFER FUNCTIONALITY
// ============================================

function openDeferModal(task, fromDate, index) {
    deferringTask = { task, fromDate, index };
    document.getElementById('deferModal').classList.add('active');

    // Set min date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('deferDatePicker').min = formatDate(tomorrow);
}

function closeDeferModal() {
    document.getElementById('deferModal').classList.remove('active');
    deferringTask = null;
}

function deferToQuickOption(option) {
    if (!deferringTask) return;
    
    let targetDate = new Date();
    
    switch(option) {
        case 'tomorrow':
            targetDate.setDate(targetDate.getDate() + 1);
            break;
        case 'next-week':
            // Next Monday
            const daysUntilMonday = (8 - targetDate.getDay()) % 7 || 7;
            targetDate.setDate(targetDate.getDate() + daysUntilMonday);
            break;
        case 'end-week':
            // This Friday
            const daysUntilFriday = (5 - targetDate.getDay() + 7) % 7;
            targetDate.setDate(targetDate.getDate() + daysUntilFriday);
            if (daysUntilFriday === 0) {
                targetDate.setDate(targetDate.getDate() + 7);
            }
            break;
    }
    
    deferTask(formatDate(targetDate));
}

function deferToCustomDate() {
    const dateInput = document.getElementById('deferDatePicker');
    const targetDate = dateInput.value;
    
    if (!targetDate) {
        alert('Please select a date');
        return;
    }
    
    deferTask(targetDate);
}

function deferTask(targetDate) {
    if (!deferringTask) return;

    const { task, fromDate, index } = deferringTask;

    // Mark the task as deferred (keep it in place)
    const tasks = getTasksForDate(fromDate, currentContext);
    const taskIndex = index !== undefined ? index : tasks.findIndex(t => t.id === task.id);

    if (taskIndex !== -1) {
        tasks[taskIndex].deferredTo = targetDate;
        saveTasksForDate(fromDate, currentContext, tasks);
    }

    closeDeferModal();

    // Re-render current view
    if (currentView === 'tasks') {
        renderTasksView();
    } else {
        renderDayTasks();
    }
    renderCalendar();
    renderFocusPanel();
    renderStats();
}

// ============================================
// TASKS PAGE VIEW
// ============================================

function renderTasksView() {
    if (!tasksViewDate) {
        tasksViewDate = formatDate(new Date());
    }

    const titleElement = document.getElementById('tasksDateTitle');
    const activeList = document.getElementById('activeTasksList');
    const completedList = document.getElementById('completedTasksList');
    const deferredList = document.getElementById('deferredTasksList');

    // Update title
    const date = parseDate(tasksViewDate);
    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    titleElement.textContent = dateStr;

    // Get all tasks for this date and sort them
    const tasks = getTasksForDate(tasksViewDate, currentContext);
    sortTasks(tasks);

    // Separate tasks into sections
    const activeTasks = tasks.filter(t => !t.completed && !t.deferredTo);
    const completedTasks = tasks.filter(t => t.completed);
    const deferredTasks = tasks.filter(t => t.deferredTo && !t.completed);

    // Render active tasks
    if (activeTasks.length === 0) {
        activeList.innerHTML = '<div class="empty-state"><p>No active tasks</p></div>';
    } else {
        activeList.innerHTML = '';
        activeTasks.forEach((task, index) => {
            const taskElement = createTasksPageTaskElement(task, index, 'active');
            activeList.appendChild(taskElement);
        });
    }

    // Render completed tasks
    if (completedTasks.length === 0) {
        completedList.innerHTML = '<div class="empty-state"><p>No completed tasks</p></div>';
    } else {
        completedList.innerHTML = '';
        completedTasks.forEach((task, index) => {
            const taskElement = createTasksPageTaskElement(task, index, 'completed');
            completedList.appendChild(taskElement);
        });
    }

    // Render deferred tasks
    if (deferredTasks.length === 0) {
        deferredList.innerHTML = '<div class="empty-state"><p>No deferred tasks</p></div>';
    } else {
        deferredList.innerHTML = '';
        deferredTasks.forEach((task, index) => {
            const taskElement = createTasksPageTaskElement(task, index, 'deferred');
            deferredList.appendChild(taskElement);
        });
    }
}

function createTasksPageTaskElement(task, taskIndex, section) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.status}`;

    if (task.completed) {
        taskElement.classList.add('completed');
    }

    // Find the actual index in the full tasks array
    const allTasks = getTasksForDate(tasksViewDate, currentContext);
    const actualIndex = allTasks.findIndex(t => t.id === task.id);

    // Header
    const header = document.createElement('div');
    header.className = 'task-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'task-title-group';

    const titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
        toggleTaskCompleteFromTasksPage(actualIndex);
    });

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;

    titleContainer.appendChild(checkbox);
    titleContainer.appendChild(title);
    titleGroup.appendChild(titleContainer);

    if (task.notes) {
        const notes = document.createElement('div');
        notes.className = 'task-notes';
        notes.textContent = task.notes;
        titleGroup.appendChild(notes);
    }

    // If deferred, show the deferred date
    if (task.deferredTo) {
        const deferredInfo = document.createElement('div');
        const deferredDate = parseDate(task.deferredTo);
        const deferredDateStr = deferredDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const deferredLink = document.createElement('span');
        deferredLink.className = 'deferred-date-link';
        deferredLink.textContent = `Deferred to: ${deferredDateStr}`;
        deferredLink.addEventListener('click', () => {
            tasksViewDate = task.deferredTo;
            renderTasksView();
        });

        deferredInfo.appendChild(deferredLink);
        titleGroup.appendChild(deferredInfo);
    }

    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge ${task.status}`;
    statusBadge.textContent = task.status;
    titleGroup.appendChild(statusBadge);

    header.appendChild(titleGroup);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    // Only show defer button for active tasks
    if (section === 'active') {
        const deferBtn = document.createElement('button');
        deferBtn.textContent = 'Defer';
        deferBtn.addEventListener('click', () => openDeferModalFromTasksPage(task, actualIndex));
        actions.appendChild(deferBtn);
    }

    // Show undefer button for deferred tasks
    if (section === 'deferred') {
        const undeferBtn = document.createElement('button');
        undeferBtn.textContent = 'Undefer';
        undeferBtn.addEventListener('click', () => undeferTask(actualIndex));
        actions.appendChild(undeferBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteTaskFromTasksPage(actualIndex));
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    taskElement.appendChild(header);

    return taskElement;
}

function addTaskFromTasksPage() {
    const titleInput = document.getElementById('tasksNewTaskTitle');
    const notesInput = document.getElementById('tasksNewTaskNotes');
    const statusSelect = document.getElementById('tasksNewTaskStatus');

    const title = titleInput.value.trim();
    if (!title) return;

    const task = {
        id: generateId(),
        title: title,
        notes: notesInput.value.trim(),
        status: statusSelect.value,
        completed: false,
        priority: 0,
        createdAt: Date.now()
    };

    const tasks = getTasksForDate(tasksViewDate, currentContext);
    tasks.push(task);
    sortTasks(tasks);
    saveTasksForDate(tasksViewDate, currentContext, tasks);

    // Clear inputs
    titleInput.value = '';
    notesInput.value = '';

    // Re-render
    renderTasksView();
    renderCalendar();
}

function toggleTaskCompleteFromTasksPage(index) {
    const tasks = getTasksForDate(tasksViewDate, currentContext);
    tasks[index].completed = !tasks[index].completed;
    saveTasksForDate(tasksViewDate, currentContext, tasks);
    renderTasksView();
    renderCalendar();
    if (currentView === 'dashboard') {
        renderFocusPanel();
        renderStats();
    }
}

function deleteTaskFromTasksPage(index) {
    if (!confirm('Delete this task?')) return;

    const tasks = getTasksForDate(tasksViewDate, currentContext);
    tasks.splice(index, 1);
    saveTasksForDate(tasksViewDate, currentContext, tasks);
    renderTasksView();
    renderCalendar();
}

function openDeferModalFromTasksPage(task, index) {
    deferringTask = { task, fromDate: tasksViewDate, index };
    document.getElementById('deferModal').classList.add('active');

    // Set min date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('deferDatePicker').min = formatDate(tomorrow);
}

function undeferTask(index) {
    const tasks = getTasksForDate(tasksViewDate, currentContext);
    delete tasks[index].deferredTo;
    saveTasksForDate(tasksViewDate, currentContext, tasks);
    renderTasksView();
}

// ============================================
// FOCUS PANEL
// ============================================

function renderFocusPanel() {
    const focusContainer = document.getElementById('focusTasks');
    const todayStr = formatDate(new Date());

    const tasks = getTasksForDate(todayStr, currentContext);
    sortTasks(tasks);
    const focusTasks = tasks.filter(t =>
        (t.status === 'urgent' || t.status === 'today') && !t.completed && !t.deferredTo
    );

    if (focusTasks.length === 0) {
        focusContainer.innerHTML = '<div class="empty-state"><p>No urgent tasks for today</p></div>';
        return;
    }

    focusContainer.innerHTML = '';
    focusTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = `focus-task ${task.status}`;

        const title = document.createElement('h4');
        title.textContent = task.title;
        taskElement.appendChild(title);

        const badge = document.createElement('span');
        badge.className = `status-badge ${task.status}`;
        badge.textContent = task.status;
        taskElement.appendChild(badge);

        focusContainer.appendChild(taskElement);
    });
}

// ============================================
// STATS
// ============================================

function renderStats() {
    const statsContainer = document.getElementById('todayStats');
    const todayStr = formatDate(new Date());
    const tasks = getTasksForDate(todayStr, currentContext);

    const totalTasks = tasks.length;
    const urgentTasks = tasks.filter(t => t.status === 'urgent' && !t.completed && !t.deferredTo).length;
    const todayTasks = tasks.filter(t => t.status === 'today' && !t.completed && !t.deferredTo).length;

    const backlog = getBacklog();
    const backlogCount = backlog[currentContext].length;

    statsContainer.innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${totalTasks}</div>
            <div class="stat-label">Total Today</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${urgentTasks}</div>
            <div class="stat-label">Urgent</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${todayTasks}</div>
            <div class="stat-label">Today</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${backlogCount}</div>
            <div class="stat-label">Backlog</div>
        </div>
    `;
}

// ============================================
// BACKLOG
// ============================================

function renderBacklog() {
    const backlogList = document.getElementById('backlogTasksList');
    const backlog = getBacklog();
    const tasks = backlog[currentContext] || [];
    
    if (tasks.length === 0) {
        backlogList.innerHTML = '<div class="empty-state"><p>No backlog items</p></div>';
        return;
    }
    
    backlogList.innerHTML = '';
    tasks.forEach((task, index) => {
        const taskElement = createBacklogTaskElement(task, index);
        backlogList.appendChild(taskElement);
    });
}

function createBacklogTaskElement(task, index) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.status}`;
    
    const header = document.createElement('div');
    header.className = 'task-header';
    
    const titleGroup = document.createElement('div');
    titleGroup.className = 'task-title-group';
    
    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;
    titleGroup.appendChild(title);
    
    if (task.notes) {
        const notes = document.createElement('div');
        notes.className = 'task-notes';
        notes.textContent = task.notes;
        titleGroup.appendChild(notes);
    }
    
    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge ${task.status}`;
    statusBadge.textContent = task.status.replace('-', ' ');
    titleGroup.appendChild(statusBadge);
    
    header.appendChild(titleGroup);
    
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    
    const assignBtn = document.createElement('button');
    assignBtn.textContent = 'Assign to Date';
    assignBtn.addEventListener('click', () => openAssignModal(task, index));
    actions.appendChild(assignBtn);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteBacklogTask(index));
    actions.appendChild(deleteBtn);
    
    header.appendChild(actions);
    taskElement.appendChild(header);
    
    return taskElement;
}

function addBacklogTask() {
    const titleInput = document.getElementById('backlogTaskTitle');
    const notesInput = document.getElementById('backlogTaskNotes');
    const statusSelect = document.getElementById('backlogTaskStatus');
    
    const title = titleInput.value.trim();
    if (!title) return;
    
    const task = {
        id: generateId(),
        title: title,
        notes: notesInput.value.trim(),
        status: statusSelect.value
    };
    
    const backlog = getBacklog();
    backlog[currentContext].push(task);
    saveBacklog(backlog);
    
    titleInput.value = '';
    notesInput.value = '';
    
    renderBacklog();
    renderStats();
}

function deleteBacklogTask(index) {
    if (!confirm('Delete this backlog item?')) return;
    
    const backlog = getBacklog();
    backlog[currentContext].splice(index, 1);
    saveBacklog(backlog);
    
    renderBacklog();
    renderStats();
}

function openAssignModal(task, index) {
    assigningBacklogTask = { task, index };
    document.getElementById('assignDateModal').classList.add('active');
    
    const today = new Date();
    document.getElementById('assignDatePicker').min = formatDate(today);
}

function closeAssignModal() {
    document.getElementById('assignDateModal').classList.remove('active');
    assigningBacklogTask = null;
}

function assignBacklogTaskToDate() {
    if (!assigningBacklogTask) return;
    
    const dateInput = document.getElementById('assignDatePicker');
    const targetDate = dateInput.value;
    
    if (!targetDate) {
        alert('Please select a date');
        return;
    }
    
    const { task, index } = assigningBacklogTask;
    
    // Convert backlog task to regular task
    const newTask = {
        id: task.id,
        title: task.title,
        notes: task.notes,
        status: task.status === 'work-quality' ? 'improvements' :
                task.status === 'work-reduction' ? 'improvements' :
                task.status === 'revenue-increase' ? 'improvements' : 'today',
        completed: false,
        priority: 0,
        createdAt: Date.now()
    };

    // Add to target date
    const tasks = getTasksForDate(targetDate, currentContext);
    tasks.push(newTask);
    sortTasks(tasks);
    saveTasksForDate(targetDate, currentContext, tasks);
    
    // Remove from backlog
    const backlog = getBacklog();
    backlog[currentContext].splice(index, 1);
    saveBacklog(backlog);
    
    closeAssignModal();
    renderBacklog();
    renderCalendar();
    renderStats();
}

// ============================================
// RECURRING TASKS
// ============================================

function renderRecurringTasks() {
    const recurringList = document.getElementById('recurringTasksList');
    const recurring = getRecurringTasks();
    
    const contextTasks = recurring.filter(t => t.context === currentContext);
    
    if (contextTasks.length === 0) {
        recurringList.innerHTML = '<div class="empty-state"><p>No recurring tasks</p></div>';
        return;
    }
    
    recurringList.innerHTML = '';
    contextTasks.forEach((task, index) => {
        const taskElement = createRecurringTaskElement(task, index);
        recurringList.appendChild(taskElement);
    });
}

function createRecurringTaskElement(task, globalIndex) {
    const taskElement = document.createElement('div');
    taskElement.className = `recurring-task-item ${task.active ? '' : 'inactive'}`;
    
    const header = document.createElement('div');
    header.className = 'recurring-task-header';
    
    const title = document.createElement('div');
    title.className = 'recurring-task-title';
    title.textContent = task.title;
    header.appendChild(title);
    
    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge ${task.status}`;
    statusBadge.textContent = task.status;
    header.appendChild(statusBadge);
    
    taskElement.appendChild(header);
    
    const info = document.createElement('div');
    info.className = 'recurring-task-info';
    info.textContent = `${getFrequencyLabel(task.frequency)} • ${task.active ? 'Active' : 'Inactive'}`;
    taskElement.appendChild(info);
    
    const actions = document.createElement('div');
    actions.className = 'recurring-task-actions';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = task.active ? 'Deactivate' : 'Activate';
    toggleBtn.addEventListener('click', () => toggleRecurringTask(globalIndex));
    actions.appendChild(toggleBtn);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteRecurringTask(globalIndex));
    actions.appendChild(deleteBtn);
    
    taskElement.appendChild(actions);
    
    return taskElement;
}

function getFrequencyLabel(frequency) {
    const labels = {
        'daily': 'Daily (Mon-Fri)',
        'everyday': 'Every Day',
        'weekly-mon': 'Weekly on Monday',
        'weekly-tue': 'Weekly on Tuesday',
        'weekly-wed': 'Weekly on Wednesday',
        'weekly-thu': 'Weekly on Thursday',
        'weekly-fri': 'Weekly on Friday',
        'weekly-sat': 'Weekly on Saturday',
        'weekly-sun': 'Weekly on Sunday',
        'monthly-1': 'Monthly on 1st',
        'monthly-15': 'Monthly on 15th',
        'monthly-last': 'Monthly on Last Day',
        'monthly-first-mon': 'Monthly 1st Monday',
        'monthly-first-fri': 'Monthly 1st Friday'
    };
    return labels[frequency] || frequency;
}

function addRecurringTask() {
    const titleInput = document.getElementById('recurringTaskTitle');
    const statusSelect = document.getElementById('recurringTaskStatus');
    const frequencySelect = document.getElementById('recurringFrequency');
    
    const title = titleInput.value.trim();
    if (!title) return;
    
    const task = {
        id: generateId(),
        title: title,
        context: currentContext,
        status: statusSelect.value,
        frequency: frequencySelect.value,
        active: true,
        generatedDates: []
    };
    
    const recurring = getRecurringTasks();
    recurring.push(task);
    saveRecurringTasks(recurring);
    
    titleInput.value = '';
    
    // Generate tasks for current and next month
    generateRecurringTasks();
    
    renderRecurringTasks();
    renderCalendar();
}

function toggleRecurringTask(index) {
    const recurring = getRecurringTasks();
    const allTasks = recurring.filter(t => t.context === currentContext);
    const task = allTasks[index];
    
    // Find global index
    const globalIndex = recurring.findIndex(t => t.id === task.id);
    
    recurring[globalIndex].active = !recurring[globalIndex].active;
    saveRecurringTasks(recurring);
    
    renderRecurringTasks();
}

function deleteRecurringTask(index) {
    if (!confirm('Delete this recurring task?')) return;
    
    const recurring = getRecurringTasks();
    const allTasks = recurring.filter(t => t.context === currentContext);
    const task = allTasks[index];
    
    // Find global index
    const globalIndex = recurring.findIndex(t => t.id === task.id);
    
    recurring.splice(globalIndex, 1);
    saveRecurringTasks(recurring);
    
    renderRecurringTasks();
}

/**
 * Generate recurring tasks for the current and next 2 months
 */
function generateRecurringTasks() {
    const recurring = getRecurringTasks();
    const today = new Date();
    
    // Generate for current month and next 2 months
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
        const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
        
        recurring.forEach(recurringTask => {
            if (!recurringTask.active) return;
            
            const dates = getDatesForRecurringTask(recurringTask, targetMonth);
            
            dates.forEach(dateStr => {
                // Check if already generated
                if (recurringTask.generatedDates.includes(dateStr)) return;
                
                // Add task to date
                const tasks = getTasksForDate(dateStr, recurringTask.context);
                
                // Check if task already exists (by title)
                const exists = tasks.some(t => t.title === recurringTask.title);
                if (exists) return;
                
                const task = {
                    id: generateId(),
                    title: recurringTask.title,
                    notes: '',
                    status: recurringTask.status,
                    completed: false,
                    priority: 0,
                    createdAt: Date.now()
                };

                tasks.push(task);
                sortTasks(tasks);
                saveTasksForDate(dateStr, recurringTask.context, tasks);
                
                // Mark as generated
                recurringTask.generatedDates.push(dateStr);
            });
        });
    }
    
    saveRecurringTasks(recurring);
}

/**
 * Get all dates in a month that match the recurring frequency
 */
function getDatesForRecurringTask(task, targetMonth) {
    const dates = [];
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const frequency = task.frequency;
    
    if (frequency === 'everyday') {
        for (let day = 1; day <= daysInMonth; day++) {
            dates.push(formatDate(new Date(year, month, day)));
        }
    } else if (frequency === 'daily') {
        // Monday through Friday
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                dates.push(formatDate(date));
            }
        }
    } else if (frequency.startsWith('weekly-')) {
        const dayMap = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0 };
        const targetDay = dayMap[frequency.split('-')[1]];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            if (date.getDay() === targetDay) {
                dates.push(formatDate(date));
            }
        }
    } else if (frequency.startsWith('monthly-')) {
        if (frequency === 'monthly-1') {
            dates.push(formatDate(new Date(year, month, 1)));
        } else if (frequency === 'monthly-15') {
            if (daysInMonth >= 15) {
                dates.push(formatDate(new Date(year, month, 15)));
            }
        } else if (frequency === 'monthly-last') {
            dates.push(formatDate(new Date(year, month, daysInMonth)));
        } else if (frequency === 'monthly-first-mon') {
            // First Monday
            for (let day = 1; day <= 7; day++) {
                const date = new Date(year, month, day);
                if (date.getDay() === 1) {
                    dates.push(formatDate(date));
                    break;
                }
            }
        } else if (frequency === 'monthly-first-fri') {
            // First Friday
            for (let day = 1; day <= 7; day++) {
                const date = new Date(year, month, day);
                if (date.getDay() === 5) {
                    dates.push(formatDate(date));
                    break;
                }
            }
        }
    }
    
    return dates;
}

// ============================================
// MASS ENTRY
// ============================================

function renderMassEntry() {
    const tbody = document.getElementById('massEntryTableBody');
    
    // Add initial rows if empty
    if (tbody.children.length === 0) {
        for (let i = 0; i < 5; i++) {
            addMassEntryRow();
        }
    }
}

function addMassEntryRow() {
    const tbody = document.getElementById('massEntryTableBody');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><input type="text" placeholder="Task title"></td>
        <td><textarea placeholder="Notes"></textarea></td>
        <td>
            <select>
                <option value="work" ${currentContext === 'work' ? 'selected' : ''}>Work</option>
                <option value="rescue" ${currentContext === 'rescue' ? 'selected' : ''}>Rescue</option>
                <option value="personal" ${currentContext === 'personal' ? 'selected' : ''}>Personal</option>
                <option value="school" ${currentContext === 'school' ? 'selected' : ''}>School</option>
            </select>
        </td>
        <td>
            <select>
                <option value="urgent">Urgent</option>
                <option value="today">Today</option>
                <option value="leisure">Leisure</option>
                <option value="improvements">Improvements</option>
            </select>
        </td>
        <td><input type="date"></td>
        <td><button class="remove-row-btn">Remove</button></td>
    `;
    
    row.querySelector('.remove-row-btn').addEventListener('click', () => {
        row.remove();
    });
    
    tbody.appendChild(row);
}

function saveMassEntry() {
    const tbody = document.getElementById('massEntryTableBody');
    const rows = tbody.querySelectorAll('tr');
    
    let savedCount = 0;
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const title = cells[0].querySelector('input').value.trim();
        
        if (!title) return;
        
        const notes = cells[1].querySelector('textarea').value.trim();
        const context = cells[2].querySelector('select').value;
        const status = cells[3].querySelector('select').value;
        const dateStr = cells[4].querySelector('input').value;
        
        const task = {
            id: generateId(),
            title: title,
            notes: notes,
            status: status,
            completed: false,
            priority: 0,
            createdAt: Date.now()
        };

        if (dateStr) {
            // Add to specific date
            const tasks = getTasksForDate(dateStr, context);
            tasks.push(task);
            sortTasks(tasks);
            saveTasksForDate(dateStr, context, tasks);
        } else {
            // Add to backlog
            const backlog = getBacklog();
            // Convert status if needed
            const backlogTask = {
                id: task.id,
                title: task.title,
                notes: task.notes,
                status: task.status === 'improvements' ? 'improvements' : 'work-quality'
            };
            backlog[context].push(backlogTask);
            saveBacklog(backlog);
        }
        
        savedCount++;
        
        // Clear row
        cells[0].querySelector('input').value = '';
        cells[1].querySelector('textarea').value = '';
        cells[4].querySelector('input').value = '';
    });
    
    if (savedCount > 0) {
        alert(`${savedCount} task(s) saved successfully!`);
        renderCalendar();
        renderStats();
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Auto-generate recurring tasks on load
window.addEventListener('load', () => {
    generateRecurringTasks();
});
