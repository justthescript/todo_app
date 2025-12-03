/**
 * ============================================
 * API UTILITY MODULE
 * ============================================
 * Handles all communication with the backend API
 */

const API_BASE_URL = window.location.origin + '/api';

/**
 * Get auth token from localStorage
 */
function getAuthToken() {
    return localStorage.getItem('authToken');
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!getAuthToken();
}

/**
 * Redirect to login if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    window.location.href = '/login.html';
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Handle unauthorized
        if (response.status === 401 || response.status === 403) {
            logout();
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==================== TASKS API ====================

/**
 * Get all tasks
 */
async function apiGetTasks() {
    return await apiRequest('/tasks');
}

/**
 * Create a new task
 */
async function apiCreateTask(task) {
    return await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify(task),
    });
}

/**
 * Update a task
 */
async function apiUpdateTask(taskId, task) {
    return await apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(task),
    });
}

/**
 * Delete a task
 */
async function apiDeleteTask(taskId) {
    return await apiRequest(`/tasks/${taskId}`, {
        method: 'DELETE',
    });
}

/**
 * Clear all tasks
 */
async function apiClearAllTasks() {
    return await apiRequest('/tasks/all/clear', {
        method: 'DELETE',
    });
}

// ==================== BACKLOG API ====================

/**
 * Get backlog
 */
async function apiGetBacklog() {
    return await apiRequest('/backlog');
}

/**
 * Create backlog task
 */
async function apiCreateBacklogTask(task) {
    return await apiRequest('/backlog', {
        method: 'POST',
        body: JSON.stringify(task),
    });
}

/**
 * Update backlog task
 */
async function apiUpdateBacklogTask(taskId, task) {
    return await apiRequest(`/backlog/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(task),
    });
}

/**
 * Delete backlog task
 */
async function apiDeleteBacklogTask(taskId) {
    return await apiRequest(`/backlog/${taskId}`, {
        method: 'DELETE',
    });
}

// ==================== RECURRING TASKS API ====================

/**
 * Get recurring tasks
 */
async function apiGetRecurringTasks() {
    return await apiRequest('/recurring-tasks');
}

/**
 * Create recurring task
 */
async function apiCreateRecurringTask(task) {
    return await apiRequest('/recurring-tasks', {
        method: 'POST',
        body: JSON.stringify(task),
    });
}

/**
 * Update recurring task
 */
async function apiUpdateRecurringTask(taskId, task) {
    return await apiRequest(`/recurring-tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(task),
    });
}

/**
 * Delete recurring task
 */
async function apiDeleteRecurringTask(taskId, deleteInstances = false) {
    return await apiRequest(`/recurring-tasks/${taskId}?deleteInstances=${deleteInstances}`, {
        method: 'DELETE',
    });
}

// ==================== SETTINGS API ====================

/**
 * Get user settings
 */
async function apiGetSettings() {
    return await apiRequest('/settings');
}

/**
 * Update user settings
 */
async function apiUpdateSettings(settings) {
    return await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}

// ==================== CUSTOM STATUSES API ====================

/**
 * Get custom statuses
 */
async function apiGetCustomStatuses() {
    return await apiRequest('/custom-statuses');
}

/**
 * Create custom status
 */
async function apiCreateCustomStatus(status, color) {
    return await apiRequest('/custom-statuses', {
        method: 'POST',
        body: JSON.stringify({ status, color }),
    });
}

/**
 * Delete custom status
 */
async function apiDeleteCustomStatus(statusId) {
    return await apiRequest(`/custom-statuses/${statusId}`, {
        method: 'DELETE',
    });
}

// ==================== CUSTOM CATEGORIES API ====================

/**
 * Get custom categories
 */
async function apiGetCustomCategories() {
    return await apiRequest('/custom-categories');
}

/**
 * Create custom category
 */
async function apiCreateCustomCategory(category) {
    return await apiRequest('/custom-categories', {
        method: 'POST',
        body: JSON.stringify({ category }),
    });
}

/**
 * Delete custom category
 */
async function apiDeleteCustomCategory(categoryId) {
    return await apiRequest(`/custom-categories/${categoryId}`, {
        method: 'DELETE',
    });
}

// ==================== CLASSES API ====================

/**
 * Get all classes
 */
async function apiGetClasses() {
    return await apiRequest('/classes');
}

/**
 * Create class
 */
async function apiCreateClass(classData) {
    return await apiRequest('/classes', {
        method: 'POST',
        body: JSON.stringify(classData),
    });
}

/**
 * Update class
 */
async function apiUpdateClass(classId, classData) {
    return await apiRequest(`/classes/${classId}`, {
        method: 'PUT',
        body: JSON.stringify(classData),
    });
}

/**
 * Delete class
 */
async function apiDeleteClass(classId) {
    return await apiRequest(`/classes/${classId}`, {
        method: 'DELETE',
    });
}

// ==================== MODULES API ====================

/**
 * Get all modules
 */
async function apiGetModules() {
    return await apiRequest('/modules');
}

/**
 * Create module
 */
async function apiCreateModule(module) {
    return await apiRequest('/modules', {
        method: 'POST',
        body: JSON.stringify(module),
    });
}

/**
 * Update module
 */
async function apiUpdateModule(moduleId, module) {
    return await apiRequest(`/modules/${moduleId}`, {
        method: 'PUT',
        body: JSON.stringify(module),
    });
}

/**
 * Delete module
 */
async function apiDeleteModule(moduleId) {
    return await apiRequest(`/modules/${moduleId}`, {
        method: 'DELETE',
    });
}
