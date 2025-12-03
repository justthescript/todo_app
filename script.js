/**
 * ============================================
 * CONTEXT TASK MANAGER - Main JavaScript
 * ============================================
 *
 * Now uses backend API for data storage to support cross-device sync
 */

// ============================================
// AUTHENTICATION CHECK
// ============================================

// Check if user is authenticated on page load
if (!requireAuth()) {
    // User will be redirected to login page
    throw new Error('Not authenticated');
}

// ============================================
// GLOBAL STATE
// ============================================

// Cache for data loaded from API
let cachedTasks = {};
let cachedBacklog = { work: [], rescue: [], personal: [], school: [] };
let cachedRecurringTasks = [];
let cachedClasses = [];
let cachedModules = [];
let cachedCustomStatuses = [];
let cachedCustomCategories = [];

let currentContext = 'work'; // work | rescue | personal | school
let currentView = 'dashboard'; // dashboard | tasks | backlog | recurring | mass-entry | classes | settings
let currentDate = new Date();
let selectedDate = null;
let currentMonth = new Date();
let tasksViewDate = null; // Date currently being viewed in Tasks page
let deferringTask = null; // Task being deferred
let assigningBacklogTask = null; // Backlog task being assigned
let assigningModuleToWeek = null; // Module being assigned to a week
let currentWeekIndex = 0; // Current week index for School context

// ============================================
// SCHOOL ACADEMIC CALENDAR
// ============================================

/**
 * Define academic calendar weeks (Wednesday to Tuesday)
 * Fall Semester: Weeks 8-10
 * Spring Semester: Weeks 1-10
 */
const ACADEMIC_WEEKS = [
    // Fall Semester
    { weekNumber: 8, semester: 'Fall', startDate: '2024-12-03', endDate: '2024-12-09' },
    { weekNumber: 9, semester: 'Fall', startDate: '2024-12-10', endDate: '2024-12-16' },
    { weekNumber: 10, semester: 'Fall', startDate: '2024-12-17', endDate: '2024-12-21' },
    // Spring Semester
    { weekNumber: 1, semester: 'Spring', startDate: '2025-01-07', endDate: '2025-01-13' },
    { weekNumber: 2, semester: 'Spring', startDate: '2025-01-14', endDate: '2025-01-20' },
    { weekNumber: 3, semester: 'Spring', startDate: '2025-01-21', endDate: '2025-01-27' },
    { weekNumber: 4, semester: 'Spring', startDate: '2025-01-28', endDate: '2025-02-03' },
    { weekNumber: 5, semester: 'Spring', startDate: '2025-02-04', endDate: '2025-02-10' },
    { weekNumber: 6, semester: 'Spring', startDate: '2025-02-11', endDate: '2025-02-17' },
    { weekNumber: 7, semester: 'Spring', startDate: '2025-02-18', endDate: '2025-02-24' },
    { weekNumber: 8, semester: 'Spring', startDate: '2025-02-25', endDate: '2025-03-03' },
    { weekNumber: 9, semester: 'Spring', startDate: '2025-03-04', endDate: '2025-03-10' },
    { weekNumber: 10, semester: 'Spring', startDate: '2025-03-17', endDate: '2025-03-22' }
];

// ============================================
// DATA MANAGEMENT - Now using API
// ============================================

/**
 * Load all data from API
 */
async function loadAllData() {
    try {
        const [tasks, backlog, recurring, classes, modules, statuses, categories, settings] = await Promise.all([
            apiGetTasks(),
            apiGetBacklog(),
            apiGetRecurringTasks(),
            apiGetClasses(),
            apiGetModules(),
            apiGetCustomStatuses(),
            apiGetCustomCategories(),
            apiGetSettings()
        ]);

        cachedTasks = tasks || {};
        cachedBacklog = backlog || { work: [], rescue: [], personal: [], school: [] };
        cachedRecurringTasks = recurring || [];
        cachedClasses = classes || [];
        cachedModules = modules || [];
        cachedCustomStatuses = statuses?.length > 0 ? statuses : [
            { id: 1, status: 'urgent', color: '#f56565' },
            { id: 2, status: 'today', color: '#ecc94b' },
            { id: 3, status: 'leisure', color: '#48bb78' },
            { id: 4, status: 'improvements', color: '#9f7aea' }
        ];
        cachedCustomCategories = categories?.length > 0 ? categories : [
            { id: 1, category: 'improvements' },
            { id: 2, category: 'work-quality' },
            { id: 3, category: 'work-reduction' },
            { id: 4, category: 'revenue-increase' }
        ];

        // Apply theme
        if (settings) {
            document.body.setAttribute('data-theme', settings.theme || 'light');
            document.querySelector('.theme-icon').textContent = (settings.theme === 'dark') ? '☀️' : '🌙';
        }
    } catch (error) {
        console.error('Failed to load data:', error);
        alert('Failed to load data. Please refresh the page.');
    }
}

/**
 * Get all tasks
 */
function getTasks() {
    return cachedTasks;
}

/**
 * Save tasks (no-op, handled by API calls)
 */
function saveTasks(tasks) {
    cachedTasks = tasks;
}

/**
 * Get tasks for a specific date and context
 */
function getTasksForDate(dateStr, context) {
    if (!cachedTasks[dateStr] || !cachedTasks[dateStr][context]) {
        return [];
    }
    return cachedTasks[dateStr][context];
}

/**
 * Save tasks for a specific date and context
 */
async function saveTasksForDate(dateStr, context, taskList) {
    if (!cachedTasks[dateStr]) {
        cachedTasks[dateStr] = {};
    }
    cachedTasks[dateStr][context] = taskList;
}

/**
 * Get backlog tasks
 */
function getBacklog() {
    return cachedBacklog;
}

/**
 * Save backlog tasks (no-op, handled by API calls)
 */
function saveBacklog(backlog) {
    cachedBacklog = backlog;
}

/**
 * Get recurring tasks
 */
function getRecurringTasks() {
    return cachedRecurringTasks;
}

/**
 * Save recurring tasks (no-op, handled by API calls)
 */
function saveRecurringTasks(recurring) {
    cachedRecurringTasks = recurring;
}

/**
 * Get settings
 */
function getSettings() {
    return { theme: document.body.getAttribute('data-theme') || 'light' };
}

/**
 * Save settings
 */
async function saveSettings(settings) {
    try {
        await apiUpdateSettings(settings);
        document.body.setAttribute('data-theme', settings.theme);
        document.querySelector('.theme-icon').textContent = settings.theme === 'dark' ? '☀️' : '🌙';
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

/**
 * Get custom statuses
 */
function getCustomStatuses() {
    return cachedCustomStatuses.map(s => ({
        id: s.status || s.id,
        name: s.status || s.name,
        color: s.color
    }));
}

/**
 * Save custom statuses (no-op, handled by API calls)
 */
function saveCustomStatuses(statuses) {
    // Handled by individual API calls
}

/**
 * Get custom categories (for backlog)
 */
function getCustomCategories() {
    return cachedCustomCategories.map(c => ({
        id: c.category || c.id,
        name: c.category || c.name
    }));
}

/**
 * Save custom categories (no-op, handled by API calls)
 */
function saveCustomCategories(categories) {
    // Handled by individual API calls
}

/**
 * Get classes (for school context)
 */
function getClasses() {
    // Reconstruct classes with modules
    return cachedClasses.map(classItem => {
        const classModules = cachedModules.filter(m => m.class_id === classItem.id);
        return {
            id: classItem.id,
            name: classItem.name,
            color: classItem.color,
            modules: classModules.map(m => ({
                id: m.id,
                name: m.name,
                weekNumber: m.week_number,
                status: m.status,
                completed: m.completed
            }))
        };
    });
}

/**
 * Save classes (no-op, handled by API calls)
 */
function saveClasses(classes) {
    // Handled by individual API calls
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
// SCHOOL WEEK HELPERS
// ============================================

/**
 * Get current week index based on today's date
 */
function getCurrentWeekIndex() {
    const today = formatDate(new Date());
    for (let i = 0; i < ACADEMIC_WEEKS.length; i++) {
        const week = ACADEMIC_WEEKS[i];
        if (today >= week.startDate && today <= week.endDate) {
            return i;
        }
    }
    // If not in any academic week, return first week
    return 0;
}

/**
 * Get all dates in a week range
 */
function getDatesInWeek(startDate, endDate) {
    const dates = [];
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    let current = new Date(start);
    while (current <= end) {
        dates.push(formatDate(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

/**
 * Get all tasks for a week
 */
function getTasksForWeek(weekIndex) {
    const week = ACADEMIC_WEEKS[weekIndex];
    const dates = getDatesInWeek(week.startDate, week.endDate);
    const allTasks = [];

    dates.forEach(dateStr => {
        const tasks = getTasksForDate(dateStr, 'school');
        tasks.forEach(task => {
            allTasks.push({
                ...task,
                date: dateStr
            });
        });
    });

    return allTasks;
}

/**
 * Format week date range for display
 */
function formatWeekDateRange(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });

    if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()}-${end.getDate()}`;
    } else {
        return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

async function initializeApp() {
    // Load all data from API
    await loadAllData();

    // Generate recurring tasks for current month
    await generateRecurringTasks();

    // Set initial selected date to today
    selectedDate = formatDate(currentDate);
    tasksViewDate = formatDate(currentDate);

    // Set initial week index for school
    currentWeekIndex = getCurrentWeekIndex();

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

    // School week navigation
    document.getElementById('prevWeek').addEventListener('click', () => {
        if (currentWeekIndex > 0) {
            currentWeekIndex--;
            renderSchoolWeeks();
        }
    });

    document.getElementById('nextWeek').addEventListener('click', () => {
        if (currentWeekIndex < ACADEMIC_WEEKS.length - 1) {
            currentWeekIndex++;
            renderSchoolWeeks();
        }
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

    // Assign week modal (for school modules)
    document.getElementById('closeWeekModal').addEventListener('click', closeWeekModal);
    document.getElementById('assignWeekBtn').addEventListener('click', assignModuleToWeek);

    // Settings page
    document.getElementById('addStatusBtn').addEventListener('click', addCustomStatus);
    document.getElementById('addCategoryBtn').addEventListener('click', addCustomCategory);
    document.getElementById('clearAllTasksBtn').addEventListener('click', clearAllTasks);

    // Classes page
    document.getElementById('addClassBtn').addEventListener('click', addClass);

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    });
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
        'mass-entry': 'massEntryView',
        'classes': 'classesView',
        'settings': 'settingsView'
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
    } else if (view === 'classes') {
        renderClasses();
    } else if (view === 'settings') {
        renderSettings();
    }
}

function refreshCurrentView() {
    if (currentView === 'dashboard') {
        // Toggle between calendar and week view based on context
        if (currentContext === 'school') {
            document.getElementById('calendarSection').style.display = 'none';
            document.getElementById('schoolWeekSection').style.display = 'block';
            renderSchoolWeeks();
        } else {
            document.getElementById('calendarSection').style.display = 'block';
            document.getElementById('schoolWeekSection').style.display = 'none';
            renderCalendar();
        }
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
// SCHOOL WEEK VIEW
// ============================================

function renderSchoolWeeks() {
    const weekBlocksContainer = document.getElementById('weekBlocks');
    const weekTitle = document.getElementById('currentWeekTitle');

    // Clear container
    weekBlocksContainer.innerHTML = '';

    // Get current week
    const currentWeek = ACADEMIC_WEEKS[currentWeekIndex];

    // Update title
    weekTitle.textContent = `Week ${currentWeek.weekNumber} - ${currentWeek.semester} ${currentWeek.semester === 'Fall' ? '2024' : '2025'}`;

    // Update navigation buttons
    document.getElementById('prevWeek').disabled = currentWeekIndex === 0;
    document.getElementById('nextWeek').disabled = currentWeekIndex === ACADEMIC_WEEKS.length - 1;

    // Render all weeks
    ACADEMIC_WEEKS.forEach((week, index) => {
        const weekBlock = createWeekBlock(week, index);
        weekBlocksContainer.appendChild(weekBlock);
    });
}

function createWeekBlock(week, index) {
    const weekBlock = document.createElement('div');
    weekBlock.className = 'week-block';
    weekBlock.dataset.weekIndex = index;

    // Check if this is the current week
    const today = formatDate(new Date());
    if (today >= week.startDate && today <= week.endDate) {
        weekBlock.classList.add('current-week');
    }

    // Make week block a drop zone
    weekBlock.addEventListener('dragover', (e) => {
        e.preventDefault();
        weekBlock.classList.add('drag-over');
    });

    weekBlock.addEventListener('dragleave', () => {
        weekBlock.classList.remove('drag-over');
    });

    weekBlock.addEventListener('drop', (e) => {
        e.preventDefault();
        weekBlock.classList.remove('drag-over');

        const moduleData = e.dataTransfer.getData('application/json');
        if (moduleData) {
            const { classIndex, moduleIndex } = JSON.parse(moduleData);
            assignModuleToWeekDirect(classIndex, moduleIndex, index);
        }
    });

    // Header
    const header = document.createElement('div');
    header.className = 'week-block-header';

    const title = document.createElement('div');
    title.className = 'week-block-title';
    title.textContent = `Week ${week.weekNumber} - ${week.semester}`;
    header.appendChild(title);

    const dateRange = document.createElement('div');
    dateRange.className = 'week-block-date-range';
    dateRange.textContent = formatWeekDateRange(week.startDate, week.endDate);
    header.appendChild(dateRange);

    weekBlock.appendChild(header);

    // Get assigned modules for this week
    const classes = getClasses();
    const assignedModules = [];
    classes.forEach((classItem, classIndex) => {
        if (classItem.modules) {
            classItem.modules.forEach((module, moduleIndex) => {
                if (module.weekIndex === index) {
                    assignedModules.push({
                        ...module,
                        className: classItem.name,
                        classIndex,
                        moduleIndex
                    });
                }
            });
        }
    });

    // Show assigned modules
    if (assignedModules.length > 0) {
        const modulesSection = document.createElement('div');
        modulesSection.className = 'week-modules-section';

        const modulesHeader = document.createElement('div');
        modulesHeader.className = 'week-modules-header';
        modulesHeader.textContent = 'Assigned Modules:';
        modulesSection.appendChild(modulesHeader);

        assignedModules.forEach(module => {
            const moduleChip = document.createElement('div');
            moduleChip.className = 'week-module-chip';
            moduleChip.innerHTML = `
                <span class="module-chip-name">${module.name}</span>
                <span class="module-chip-class">(${module.className})</span>
            `;
            modulesSection.appendChild(moduleChip);
        });

        weekBlock.appendChild(modulesSection);
    }

    // Get tasks for this week
    const weekTasks = getTasksForWeek(index);
    const urgentTasks = weekTasks.filter(t => t.status === 'urgent' && !t.completed);
    const completedTasks = weekTasks.filter(t => t.completed);

    // Stats
    const stats = document.createElement('div');
    stats.className = 'week-block-stats';

    const totalStat = document.createElement('div');
    totalStat.className = 'week-stat';
    totalStat.innerHTML = `<span class="week-stat-badge">${weekTasks.length}</span> Total Tasks`;
    stats.appendChild(totalStat);

    if (urgentTasks.length > 0) {
        const urgentStat = document.createElement('div');
        urgentStat.className = 'week-stat';
        urgentStat.innerHTML = `<span class="week-stat-badge" style="background: var(--urgent-color); color: white;">${urgentTasks.length}</span> Urgent`;
        stats.appendChild(urgentStat);
    }

    if (assignedModules.length > 0) {
        const modulesStat = document.createElement('div');
        modulesStat.className = 'week-stat';
        modulesStat.innerHTML = `<span class="week-stat-badge" style="background: var(--school-color); color: white;">${assignedModules.length}</span> Modules`;
        stats.appendChild(modulesStat);
    }

    const completedStat = document.createElement('div');
    completedStat.className = 'week-stat';
    completedStat.innerHTML = `<span class="week-stat-badge" style="background: var(--leisure-color); color: white;">${completedTasks.length}</span> Completed`;
    stats.appendChild(completedStat);

    weekBlock.appendChild(stats);

    // Click to view week details in Tasks view (only if not clicking on modules)
    weekBlock.addEventListener('click', (e) => {
        // Don't navigate if clicking on modules section
        if (e.target.closest('.week-modules-section')) return;

        // Set the tasksViewDate to the first date of the week
        tasksViewDate = week.startDate;
        currentView = 'tasks';
        updateNavButtons();
        switchView('tasks');
    });

    return weekBlock;
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

    const moveToBacklogBtn = document.createElement('button');
    moveToBacklogBtn.textContent = 'Move to Backlog';
    moveToBacklogBtn.addEventListener('click', () => moveTaskToBacklog(dateStr, index));
    actions.appendChild(moveToBacklogBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteTask(dateStr, index));
    actions.appendChild(deleteBtn);
    
    header.appendChild(actions);
    taskElement.appendChild(header);
    
    return taskElement;
}

async function addTask() {
    const titleInput = document.getElementById('newTaskTitle');
    const notesInput = document.getElementById('newTaskNotes');
    const statusSelect = document.getElementById('newTaskStatus');

    const title = titleInput.value.trim();
    if (!title) return;

    const task = {
        id: generateId(),
        date: selectedDate,
        context: currentContext,
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
    await saveTasksForDate(selectedDate, currentContext, tasks);

    // Save to API
    try {
        await apiCreateTask(task);
    } catch (error) {
        console.error('Failed to create task:', error);
        alert('Failed to create task. Please try again.');
        return;
    }

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

        const moveToBacklogBtn = document.createElement('button');
        moveToBacklogBtn.textContent = 'Move to Backlog';
        moveToBacklogBtn.addEventListener('click', () => moveTaskToBacklogFromTasksPage(actualIndex));
        actions.appendChild(moveToBacklogBtn);
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

    backlogList.innerHTML = '';

    // For school context, also show modules grouped by class
    if (currentContext === 'school') {
        const classes = getClasses();

        if (classes.length > 0) {
            classes.forEach((classItem, classIndex) => {
                if (classItem.modules && classItem.modules.length > 0) {
                    const classSection = document.createElement('div');
                    classSection.className = 'backlog-class-section';

                    const classHeader = document.createElement('h3');
                    classHeader.className = 'backlog-class-header';
                    classHeader.textContent = classItem.name;
                    classSection.appendChild(classHeader);

                    const modulesList = document.createElement('div');
                    modulesList.className = 'backlog-modules-list';

                    classItem.modules.forEach((module, moduleIndex) => {
                        const moduleElement = createBacklogModuleElement(module, classIndex, moduleIndex);
                        modulesList.appendChild(moduleElement);
                    });

                    classSection.appendChild(modulesList);
                    backlogList.appendChild(classSection);
                }
            });
        }

        // Show separator if there are both classes and tasks
        if (classes.length > 0 && tasks.length > 0) {
            const separator = document.createElement('hr');
            separator.style.margin = '20px 0';
            backlogList.appendChild(separator);

            const otherTasksHeader = document.createElement('h3');
            otherTasksHeader.className = 'backlog-class-header';
            otherTasksHeader.textContent = 'Other Backlog Items';
            backlogList.appendChild(otherTasksHeader);
        }
    }

    // Show regular backlog tasks
    if (tasks.length === 0 && (currentContext !== 'school' || getClasses().length === 0)) {
        backlogList.innerHTML = '<div class="empty-state"><p>No backlog items</p></div>';
        return;
    }

    tasks.forEach((task, index) => {
        const taskElement = createBacklogTaskElement(task, index);
        backlogList.appendChild(taskElement);
    });
}

function createBacklogModuleElement(module, classIndex, moduleIndex) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task-item module-item-backlog';

    const header = document.createElement('div');
    header.className = 'task-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'task-title-group';

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = module.name;
    titleGroup.appendChild(title);

    if (module.weekNumber) {
        const weekInfo = document.createElement('div');
        weekInfo.className = 'task-notes';
        weekInfo.textContent = `Assigned to Week ${module.weekNumber} - ${module.semester}`;
        titleGroup.appendChild(weekInfo);
    }

    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge module-badge';
    statusBadge.textContent = 'Module';
    titleGroup.appendChild(statusBadge);

    header.appendChild(titleGroup);

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const assignWeekBtn = document.createElement('button');
    assignWeekBtn.textContent = module.weekNumber ? 'Reassign Week' : 'Assign Week';
    assignWeekBtn.addEventListener('click', () => openWeekAssignModal(classIndex, moduleIndex));
    actions.appendChild(assignWeekBtn);

    const viewInClassesBtn = document.createElement('button');
    viewInClassesBtn.textContent = 'View in Classes';
    viewInClassesBtn.addEventListener('click', () => {
        currentView = 'classes';
        updateNavButtons();
        switchView('classes');
    });
    actions.appendChild(viewInClassesBtn);

    header.appendChild(actions);
    taskElement.appendChild(header);

    return taskElement;
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

async function deleteRecurringTask(index) {
    const recurring = getRecurringTasks();
    const allTasks = recurring.filter(t => t.context === currentContext);
    const task = allTasks[index];

    // Ask user if they want to delete all instances
    const deleteAll = confirm('Do you want to remove all instances of this recurring task from your calendar?\n\nClick OK to delete the series and all generated tasks.\nClick Cancel to only delete the recurring task definition (generated tasks will remain).');

    // Find global index
    const globalIndex = recurring.findIndex(t => t.id === task.id);

    // Delete via API
    try {
        await apiDeleteRecurringTask(task.id, deleteAll);

        // Update local cache
        recurring.splice(globalIndex, 1);
        saveRecurringTasks(recurring);

        // If deleting all instances, remove from local cache too
        if (deleteAll) {
            const tasks = getTasks();
            Object.keys(tasks).forEach(dateStr => {
                Object.keys(tasks[dateStr]).forEach(context => {
                    tasks[dateStr][context] = tasks[dateStr][context].filter(t => t.title !== task.title);
                });
            });
            saveTasks(tasks);
        }

        renderRecurringTasks();
        refreshCurrentView();
    } catch (error) {
        console.error('Failed to delete recurring task:', error);
        alert('Failed to delete recurring task. Please try again.');
    }
}

/**
 * Generate recurring tasks for the current and next 2 months (excluding past dates)
 */
async function generateRecurringTasks() {
    const recurring = getRecurringTasks();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day

    // Generate for current month and next 2 months
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
        const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);

        for (const recurringTask of recurring) {
            if (!recurringTask.active) continue;

            const dates = getDatesForRecurringTask(recurringTask, targetMonth);

            for (const dateStr of dates) {
                // Check if date is in the past
                const taskDate = parseDate(dateStr);
                if (taskDate < today) {
                    // Skip past dates
                    continue;
                }

                // Check if already generated
                if (recurringTask.generatedDates && recurringTask.generatedDates.includes(dateStr)) continue;

                // Add task to date
                const tasks = getTasksForDate(dateStr, recurringTask.context);

                // Check if task already exists (by title)
                const exists = tasks.some(t => t.title === recurringTask.title);
                if (exists) continue;

                const task = {
                    id: generateId(),
                    date: dateStr,
                    context: recurringTask.context,
                    title: recurringTask.title,
                    notes: '',
                    status: recurringTask.status,
                    completed: false,
                    priority: 0,
                    createdAt: Date.now()
                };

                tasks.push(task);
                sortTasks(tasks);
                await saveTasksForDate(dateStr, recurringTask.context, tasks);

                // Create task via API
                try {
                    await apiCreateTask(task);
                } catch (error) {
                    console.error('Failed to create recurring task:', error);
                }

                // Mark as generated
                if (!recurringTask.generatedDates) {
                    recurringTask.generatedDates = [];
                }
                recurringTask.generatedDates.push(dateStr);
            }
        }
    }

    // Update all recurring tasks via API
    for (const task of recurring) {
        try {
            await apiUpdateRecurringTask(task.id, task);
        } catch (error) {
            console.error('Failed to update recurring task:', error);
        }
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

    // Get custom statuses for the dropdown
    const statuses = getCustomStatuses();
    const statusOptions = statuses.map(s =>
        `<option value="${s.id}">${s.name}</option>`
    ).join('');

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
                ${statusOptions}
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
// SETTINGS PAGE
// ============================================

function renderSettings() {
    renderStatusesList();
    renderCategoriesList();
}

/**
 * Clear all tasks from calendar but keep recurring tasks (deactivated)
 */
async function clearAllTasks() {
    const confirmation = confirm('WARNING: This will remove ALL tasks from your calendar!\n\nRecurring tasks will be kept but deactivated.\n\nThis action cannot be undone. Continue?');

    if (!confirmation) return;

    // Double confirmation for safety
    const doubleConfirm = confirm('Are you absolutely sure? This will delete all your tasks!');

    if (!doubleConfirm) return;

    try {
        // Clear via API
        await apiClearAllTasks();

        // Clear local cache
        cachedTasks = {};
        saveTasks({});

        // Deactivate all recurring tasks in cache
        cachedRecurringTasks.forEach(task => {
            task.active = false;
        });
        saveRecurringTasks(cachedRecurringTasks);

        // Refresh views
        refreshCurrentView();

        alert('All tasks have been cleared and recurring tasks have been deactivated.');
    } catch (error) {
        console.error('Failed to clear all tasks:', error);
        alert('Failed to clear all tasks. Please try again.');
    }
}

function renderStatusesList() {
    const list = document.getElementById('statusesList');
    const statuses = getCustomStatuses();

    if (statuses.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No custom statuses</p></div>';
        return;
    }

    list.innerHTML = '';
    statuses.forEach((status, index) => {
        const item = document.createElement('div');
        item.className = 'settings-list-item';
        item.innerHTML = `
            <div class="settings-item-info">
                <span class="settings-color-preview" style="background: ${status.color}"></span>
                <span>${status.name}</span>
            </div>
            <button class="delete-settings-btn" data-index="${index}">Delete</button>
        `;
        item.querySelector('.delete-settings-btn').addEventListener('click', () => {
            deleteCustomStatus(index);
        });
        list.appendChild(item);
    });
}

function renderCategoriesList() {
    const list = document.getElementById('categoriesList');
    const categories = getCustomCategories();

    if (categories.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No custom categories</p></div>';
        return;
    }

    list.innerHTML = '';
    categories.forEach((category, index) => {
        const item = document.createElement('div');
        item.className = 'settings-list-item';
        item.innerHTML = `
            <div class="settings-item-info">
                <span>${category.name}</span>
            </div>
            <button class="delete-settings-btn" data-index="${index}">Delete</button>
        `;
        item.querySelector('.delete-settings-btn').addEventListener('click', () => {
            deleteCustomCategory(index);
        });
        list.appendChild(item);
    });
}

function addCustomStatus() {
    const nameInput = document.getElementById('newStatusName');
    const colorInput = document.getElementById('newStatusColor');

    const name = nameInput.value.trim();
    if (!name) return;

    const statuses = getCustomStatuses();
    const id = name.toLowerCase().replace(/\s+/g, '-');

    statuses.push({
        id: id,
        name: name,
        color: colorInput.value
    });

    saveCustomStatuses(statuses);
    nameInput.value = '';
    colorInput.value = '#667eea';
    renderStatusesList();
    updateAllStatusDropdowns();
}

function deleteCustomStatus(index) {
    if (!confirm('Delete this status?')) return;

    const statuses = getCustomStatuses();
    statuses.splice(index, 1);
    saveCustomStatuses(statuses);
    renderStatusesList();
    updateAllStatusDropdowns();
}

function addCustomCategory() {
    const nameInput = document.getElementById('newCategoryName');

    const name = nameInput.value.trim();
    if (!name) return;

    const categories = getCustomCategories();
    const id = name.toLowerCase().replace(/\s+/g, '-');

    categories.push({
        id: id,
        name: name
    });

    saveCustomCategories(categories);
    nameInput.value = '';
    renderCategoriesList();
    updateAllCategoryDropdowns();
}

function deleteCustomCategory(index) {
    if (!confirm('Delete this category?')) return;

    const categories = getCustomCategories();
    categories.splice(index, 1);
    saveCustomCategories(categories);
    renderCategoriesList();
    updateAllCategoryDropdowns();
}

function updateAllStatusDropdowns() {
    const statuses = getCustomStatuses();
    const dropdowns = [
        'newTaskStatus',
        'tasksNewTaskStatus',
        'statusFilter',
        'recurringTaskStatus'
    ];

    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '';

            if (id === 'statusFilter') {
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Status';
                select.appendChild(allOption);
            }

            statuses.forEach(status => {
                const option = document.createElement('option');
                option.value = status.id;
                option.textContent = status.name;
                select.appendChild(option);
            });

            if (currentValue && statuses.find(s => s.id === currentValue)) {
                select.value = currentValue;
            }
        }
    });
}

function updateAllCategoryDropdowns() {
    const categories = getCustomCategories();
    const dropdowns = ['backlogTaskStatus'];

    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '';

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });

            if (currentValue && categories.find(c => c.id === currentValue)) {
                select.value = currentValue;
            }
        }
    });
}

// ============================================
// CLASSES PAGE (SCHOOL)
// ============================================

function renderClasses() {
    const list = document.getElementById('classesList');
    const classes = getClasses();

    if (classes.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No classes yet. Add a class to get started.</p></div>';
        return;
    }

    list.innerHTML = '';
    classes.forEach((classItem, index) => {
        const classElement = createClassElement(classItem, index);
        list.appendChild(classElement);
    });
}

function createClassElement(classItem, index) {
    const div = document.createElement('div');
    div.className = 'class-item';

    const header = document.createElement('div');
    header.className = 'class-header';

    const title = document.createElement('h3');
    title.textContent = classItem.name;
    header.appendChild(title);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete Class';
    deleteBtn.className = 'delete-class-btn';
    deleteBtn.addEventListener('click', () => deleteClass(index));
    header.appendChild(deleteBtn);

    div.appendChild(header);

    // Add module form
    const addModuleForm = document.createElement('div');
    addModuleForm.className = 'add-module-form';
    addModuleForm.innerHTML = `
        <input type="text" class="module-name-input" placeholder="Module name...">
        <button class="add-module-btn">Add Module</button>
    `;
    addModuleForm.querySelector('.add-module-btn').addEventListener('click', () => {
        const input = addModuleForm.querySelector('.module-name-input');
        addModule(index, input.value.trim());
        input.value = '';
    });
    div.appendChild(addModuleForm);

    // Modules list
    const modulesList = document.createElement('div');
    modulesList.className = 'modules-list';

    if (classItem.modules && classItem.modules.length > 0) {
        classItem.modules.forEach((module, moduleIndex) => {
            const moduleElement = createModuleElement(module, index, moduleIndex);
            modulesList.appendChild(moduleElement);
        });
    } else {
        modulesList.innerHTML = '<p class="empty-modules">No modules yet</p>';
    }

    div.appendChild(modulesList);

    return div;
}

function createModuleElement(module, classIndex, moduleIndex) {
    const div = document.createElement('div');
    div.className = 'module-item';
    div.draggable = true;

    // Drag and drop handlers
    div.addEventListener('dragstart', (e) => {
        const data = JSON.stringify({ classIndex, moduleIndex });
        e.dataTransfer.setData('application/json', data);
        e.dataTransfer.effectAllowed = 'move';
        div.classList.add('dragging');
    });

    div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
    });

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '⋮⋮';
    dragHandle.title = 'Drag to assign to a week';
    div.appendChild(dragHandle);

    const info = document.createElement('div');
    info.className = 'module-info';
    info.innerHTML = `
        <span class="module-name">${module.name}</span>
        ${module.weekNumber ? `<span class="module-week">Week ${module.weekNumber} - ${module.semester}</span>` : '<span class="module-unassigned">Not assigned</span>'}
    `;
    div.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'module-actions';

    // If module is assigned to a week, show defer and complete options
    if (module.weekNumber) {
        // Mark as completed button
        const completeBtn = document.createElement('button');
        completeBtn.textContent = module.completed ? '✓ Completed' : 'Mark Complete';
        completeBtn.className = module.completed ? 'module-status-completed' : '';
        completeBtn.addEventListener('click', () => toggleModuleComplete(classIndex, moduleIndex));
        actions.appendChild(completeBtn);

        // Defer button
        const deferBtn = document.createElement('button');
        deferBtn.textContent = 'Defer';
        deferBtn.addEventListener('click', () => openWeekAssignModal(classIndex, moduleIndex));
        actions.appendChild(deferBtn);
    } else {
        // Assign button for unassigned modules
        const assignBtn = document.createElement('button');
        assignBtn.textContent = 'Assign';
        assignBtn.addEventListener('click', () => openWeekAssignModal(classIndex, moduleIndex));
        actions.appendChild(assignBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteModule(classIndex, moduleIndex));
    actions.appendChild(deleteBtn);

    div.appendChild(actions);

    // Apply completed style if module is completed
    if (module.completed) {
        div.style.opacity = '0.7';
    }

    return div;
}

function addClass() {
    const input = document.getElementById('newClassName');
    const name = input.value.trim();

    if (!name) return;

    const classes = getClasses();
    classes.push({
        id: generateId(),
        name: name,
        modules: []
    });

    saveClasses(classes);
    input.value = '';
    renderClasses();
}

function deleteClass(index) {
    if (!confirm('Delete this class and all its modules?')) return;

    const classes = getClasses();
    classes.splice(index, 1);
    saveClasses(classes);
    renderClasses();
    if (currentView === 'backlog') {
        renderBacklog();
    }
}

function addModule(classIndex, moduleName) {
    if (!moduleName) return;

    const classes = getClasses();
    if (!classes[classIndex].modules) {
        classes[classIndex].modules = [];
    }

    classes[classIndex].modules.push({
        id: generateId(),
        name: moduleName,
        weekNumber: null,
        assignedToBacklog: false
    });

    saveClasses(classes);
    renderClasses();
}

function deleteModule(classIndex, moduleIndex) {
    if (!confirm('Delete this module?')) return;

    const classes = getClasses();
    const module = classes[classIndex].modules[moduleIndex];

    // Delete via API
    if (module.id) {
        apiDeleteModule(module.id).catch(error => {
            console.error('Failed to delete module:', error);
        });
    }

    classes[classIndex].modules.splice(moduleIndex, 1);
    saveClasses(classes);
    renderClasses();
    if (currentView === 'backlog') {
        renderBacklog();
    }
}

async function toggleModuleComplete(classIndex, moduleIndex) {
    const classes = getClasses();
    const module = classes[classIndex].modules[moduleIndex];

    // Toggle completed status
    module.completed = !module.completed;
    module.status = module.completed ? 'completed' : 'pending';

    // Update via API
    if (module.id) {
        try {
            await apiUpdateModule(module.id, {
                class_id: classes[classIndex].id,
                module_number: moduleIndex + 1,
                name: module.name,
                week_number: module.weekNumber,
                status: module.status,
                completed: module.completed
            });
        } catch (error) {
            console.error('Failed to update module:', error);
            alert('Failed to update module. Please try again.');
            return;
        }
    }

    saveClasses(classes);
    renderClasses();
    if (currentContext === 'school' && currentView === 'dashboard') {
        renderSchoolWeeks();
    }
}

function openWeekAssignModal(classIndex, moduleIndex) {
    assigningModuleToWeek = { classIndex, moduleIndex };

    const select = document.getElementById('weekSelector');
    select.innerHTML = '';

    ACADEMIC_WEEKS.forEach((week, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Week ${week.weekNumber} - ${week.semester} (${formatWeekDateRange(week.startDate, week.endDate)})`;
        select.appendChild(option);
    });

    document.getElementById('assignWeekModal').classList.add('active');
}

function closeWeekModal() {
    document.getElementById('assignWeekModal').classList.remove('active');
    assigningModuleToWeek = null;
}

function assignModuleToWeek() {
    if (!assigningModuleToWeek) return;

    const { classIndex, moduleIndex } = assigningModuleToWeek;
    const weekIndex = parseInt(document.getElementById('weekSelector').value);
    const week = ACADEMIC_WEEKS[weekIndex];

    const classes = getClasses();
    classes[classIndex].modules[moduleIndex].weekNumber = week.weekNumber;
    classes[classIndex].modules[moduleIndex].weekIndex = weekIndex;
    classes[classIndex].modules[moduleIndex].semester = week.semester;

    saveClasses(classes);
    closeWeekModal();
    renderClasses();
    if (currentView === 'backlog') {
        renderBacklog();
    }
    if (currentContext === 'school' && currentView === 'dashboard') {
        renderSchoolWeeks();
    }
}

/**
 * Assign module to week directly (drag and drop)
 */
function assignModuleToWeekDirect(classIndex, moduleIndex, weekIndex) {
    const week = ACADEMIC_WEEKS[weekIndex];
    const classes = getClasses();

    classes[classIndex].modules[moduleIndex].weekNumber = week.weekNumber;
    classes[classIndex].modules[moduleIndex].weekIndex = weekIndex;
    classes[classIndex].modules[moduleIndex].semester = week.semester;

    saveClasses(classes);

    // Refresh the views
    renderClasses();
    if (currentView === 'backlog') {
        renderBacklog();
    }
    if (currentContext === 'school' && currentView === 'dashboard') {
        renderSchoolWeeks();
    }
}

// ============================================
// MOVE TASK TO BACKLOG
// ============================================

function moveTaskToBacklog(dateStr, index) {
    const tasks = getTasksForDate(dateStr, currentContext);
    const task = tasks[index];

    // Convert to backlog task
    const backlogTask = {
        id: task.id,
        title: task.title,
        notes: task.notes,
        status: task.status
    };

    // Add to backlog
    const backlog = getBacklog();
    backlog[currentContext].push(backlogTask);
    saveBacklog(backlog);

    // Remove from tasks
    tasks.splice(index, 1);
    saveTasksForDate(dateStr, currentContext, tasks);

    // Re-render
    renderDayTasks();
    renderCalendar();
    renderStats();

    alert('Task moved to backlog');
}

function moveTaskToBacklogFromTasksPage(index) {
    const tasks = getTasksForDate(tasksViewDate, currentContext);
    const task = tasks[index];

    // Convert to backlog task
    const backlogTask = {
        id: task.id,
        title: task.title,
        notes: task.notes,
        status: task.status
    };

    // Add to backlog
    const backlog = getBacklog();
    backlog[currentContext].push(backlogTask);
    saveBacklog(backlog);

    // Remove from tasks
    tasks.splice(index, 1);
    saveTasksForDate(tasksViewDate, currentContext, tasks);

    // Re-render
    renderTasksView();
    renderCalendar();

    alert('Task moved to backlog');
}

// ============================================
// INITIALIZATION
// ============================================

// Auto-generate recurring tasks on load
window.addEventListener('load', () => {
    generateRecurringTasks();
    updateAllStatusDropdowns();
    updateAllCategoryDropdowns();
});
