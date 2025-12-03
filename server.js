require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./database');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ==================== AUTH ROUTES ====================

// Register new user
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hashedPassword);
    const userId = result.lastInsertRowid;

    // Initialize user settings
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(userId);

    // Generate JWT token
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({ token, userId, email });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find user
    const user = db.prepare('SELECT id, email, password FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, userId: user.id, email: user.email });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Request password reset
app.post('/api/auth/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token
    db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, resetToken, expiresAt.toISOString());

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Todo App account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

// Reset password with token
app.post('/api/auth/reset-password', [
  body('token').exists(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, password } = req.body;

  try {
    // Find valid token
    const resetToken = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime("now")').get(token);

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, resetToken.user_id);

    // Mark token as used
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetToken.id);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

// ==================== TASKS ROUTES ====================

// Get all tasks for user
app.get('/api/tasks', authenticateToken, (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY date, created_at').all(req.userId);

    // Group tasks by date and context
    const groupedTasks = {};
    tasks.forEach(task => {
      if (!groupedTasks[task.date]) {
        groupedTasks[task.date] = { work: [], rescue: [], personal: [], school: [] };
      }
      task.completed = Boolean(task.completed);
      groupedTasks[task.date][task.context].push(task);
    });

    res.json(groupedTasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error fetching tasks' });
  }
});

// Add task
app.post('/api/tasks', authenticateToken, (req, res) => {
  try {
    const { id, date, context, title, notes, status, completed, priority } = req.body;

    db.prepare(`
      INSERT INTO tasks (id, user_id, date, context, title, notes, status, completed, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.userId, date, context, title, notes || '', status || 'To Do', completed ? 1 : 0, priority || '');

    res.status(201).json({ message: 'Task created' });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error creating task' });
  }
});

// Update task
app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  try {
    const { date, context, title, notes, status, completed, priority } = req.body;

    db.prepare(`
      UPDATE tasks
      SET date = ?, context = ?, title = ?, notes = ?, status = ?, completed = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(date, context, title, notes || '', status, completed ? 1 : 0, priority || '', req.params.id, req.userId);

    res.json({ message: 'Task updated' });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error updating task' });
  }
});

// Delete task
app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error deleting task' });
  }
});

// Clear all tasks (but keep recurring tasks deactivated)
app.delete('/api/tasks/all/clear', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE user_id = ?').run(req.userId);
    db.prepare('UPDATE recurring_tasks SET active = 0 WHERE user_id = ?').run(req.userId);
    res.json({ message: 'All tasks cleared and recurring tasks deactivated' });
  } catch (error) {
    console.error('Clear all tasks error:', error);
    res.status(500).json({ error: 'Server error clearing tasks' });
  }
});

// ==================== BACKLOG ROUTES ====================

// Get backlog
app.get('/api/backlog', authenticateToken, (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM backlog_tasks WHERE user_id = ? ORDER BY created_at').all(req.userId);

    const backlog = { work: [], rescue: [], personal: [], school: [] };
    tasks.forEach(task => {
      task.completed = Boolean(task.completed);
      backlog[task.context].push(task);
    });

    res.json(backlog);
  } catch (error) {
    console.error('Get backlog error:', error);
    res.status(500).json({ error: 'Server error fetching backlog' });
  }
});

// Add backlog task
app.post('/api/backlog', authenticateToken, (req, res) => {
  try {
    const { id, context, title, notes, status, completed, priority } = req.body;

    db.prepare(`
      INSERT INTO backlog_tasks (id, user_id, context, title, notes, status, completed, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.userId, context, title, notes || '', status || 'To Do', completed ? 1 : 0, priority || '');

    res.status(201).json({ message: 'Backlog task created' });
  } catch (error) {
    console.error('Create backlog task error:', error);
    res.status(500).json({ error: 'Server error creating backlog task' });
  }
});

// Update backlog task
app.put('/api/backlog/:id', authenticateToken, (req, res) => {
  try {
    const { context, title, notes, status, completed, priority } = req.body;

    db.prepare(`
      UPDATE backlog_tasks
      SET context = ?, title = ?, notes = ?, status = ?, completed = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(context, title, notes || '', status, completed ? 1 : 0, priority || '', req.params.id, req.userId);

    res.json({ message: 'Backlog task updated' });
  } catch (error) {
    console.error('Update backlog task error:', error);
    res.status(500).json({ error: 'Server error updating backlog task' });
  }
});

// Delete backlog task
app.delete('/api/backlog/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM backlog_tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ message: 'Backlog task deleted' });
  } catch (error) {
    console.error('Delete backlog task error:', error);
    res.status(500).json({ error: 'Server error deleting backlog task' });
  }
});

// ==================== RECURRING TASKS ROUTES ====================

// Get recurring tasks
app.get('/api/recurring-tasks', authenticateToken, (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM recurring_tasks WHERE user_id = ? ORDER BY created_at').all(req.userId);

    tasks.forEach(task => {
      task.active = Boolean(task.active);
      task.generatedDates = JSON.parse(task.generated_dates || '[]');
      delete task.generated_dates;
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get recurring tasks error:', error);
    res.status(500).json({ error: 'Server error fetching recurring tasks' });
  }
});

// Add recurring task
app.post('/api/recurring-tasks', authenticateToken, (req, res) => {
  try {
    const { id, title, context, status, frequency, active } = req.body;

    db.prepare(`
      INSERT INTO recurring_tasks (id, user_id, title, context, status, frequency, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.userId, title, context, status || 'To Do', frequency, active ? 1 : 0);

    res.status(201).json({ message: 'Recurring task created' });
  } catch (error) {
    console.error('Create recurring task error:', error);
    res.status(500).json({ error: 'Server error creating recurring task' });
  }
});

// Update recurring task
app.put('/api/recurring-tasks/:id', authenticateToken, (req, res) => {
  try {
    const { title, context, status, frequency, active, generatedDates } = req.body;

    db.prepare(`
      UPDATE recurring_tasks
      SET title = ?, context = ?, status = ?, frequency = ?, active = ?, generated_dates = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(title, context, status, frequency, active ? 1 : 0, JSON.stringify(generatedDates || []), req.params.id, req.userId);

    res.json({ message: 'Recurring task updated' });
  } catch (error) {
    console.error('Update recurring task error:', error);
    res.status(500).json({ error: 'Server error updating recurring task' });
  }
});

// Delete recurring task (with option to delete all instances)
app.delete('/api/recurring-tasks/:id', authenticateToken, (req, res) => {
  try {
    const { deleteInstances } = req.query;

    if (deleteInstances === 'true') {
      // Get the recurring task to find its title
      const recurringTask = db.prepare('SELECT title FROM recurring_tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);

      if (recurringTask) {
        // Delete all task instances with matching title
        db.prepare('DELETE FROM tasks WHERE user_id = ? AND title = ?').run(req.userId, recurringTask.title);
      }
    }

    db.prepare('DELETE FROM recurring_tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ message: 'Recurring task deleted' });
  } catch (error) {
    console.error('Delete recurring task error:', error);
    res.status(500).json({ error: 'Server error deleting recurring task' });
  }
});

// ==================== SETTINGS ROUTES ====================

// Get user settings
app.get('/api/settings', authenticateToken, (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.userId);

    if (!settings) {
      // Create default settings if not exists
      db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(req.userId);
      return res.json({ theme: 'light', settings: {} });
    }

    res.json({
      theme: settings.theme,
      settings: JSON.parse(settings.settings_json || '{}')
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error fetching settings' });
  }
});

// Update user settings
app.put('/api/settings', authenticateToken, (req, res) => {
  try {
    const { theme, settings } = req.body;

    db.prepare(`
      UPDATE user_settings
      SET theme = ?, settings_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(theme || 'light', JSON.stringify(settings || {}), req.userId);

    res.json({ message: 'Settings updated' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error updating settings' });
  }
});

// ==================== CUSTOM STATUSES ROUTES ====================

// Get custom statuses
app.get('/api/custom-statuses', authenticateToken, (req, res) => {
  try {
    const statuses = db.prepare('SELECT * FROM custom_statuses WHERE user_id = ? ORDER BY id').all(req.userId);
    res.json(statuses);
  } catch (error) {
    console.error('Get custom statuses error:', error);
    res.status(500).json({ error: 'Server error fetching custom statuses' });
  }
});

// Add custom status
app.post('/api/custom-statuses', authenticateToken, (req, res) => {
  try {
    const { status, color } = req.body;

    const result = db.prepare('INSERT INTO custom_statuses (user_id, status, color) VALUES (?, ?, ?)').run(req.userId, status, color);

    res.status(201).json({ id: result.lastInsertRowid, status, color });
  } catch (error) {
    console.error('Create custom status error:', error);
    res.status(500).json({ error: 'Server error creating custom status' });
  }
});

// Delete custom status
app.delete('/api/custom-statuses/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM custom_statuses WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ message: 'Custom status deleted' });
  } catch (error) {
    console.error('Delete custom status error:', error);
    res.status(500).json({ error: 'Server error deleting custom status' });
  }
});

// ==================== CUSTOM CATEGORIES ROUTES ====================

// Get custom categories
app.get('/api/custom-categories', authenticateToken, (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM custom_categories WHERE user_id = ? ORDER BY id').all(req.userId);
    res.json(categories);
  } catch (error) {
    console.error('Get custom categories error:', error);
    res.status(500).json({ error: 'Server error fetching custom categories' });
  }
});

// Add custom category
app.post('/api/custom-categories', authenticateToken, (req, res) => {
  try {
    const { category } = req.body;

    const result = db.prepare('INSERT INTO custom_categories (user_id, category) VALUES (?, ?)').run(req.userId, category);

    res.status(201).json({ id: result.lastInsertRowid, category });
  } catch (error) {
    console.error('Create custom category error:', error);
    res.status(500).json({ error: 'Server error creating custom category' });
  }
});

// Delete custom category
app.delete('/api/custom-categories/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM custom_categories WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ message: 'Custom category deleted' });
  } catch (error) {
    console.error('Delete custom category error:', error);
    res.status(500).json({ error: 'Server error deleting custom category' });
  }
});

// ==================== CLASSES ROUTES ====================

// Get all classes
app.get('/api/classes', authenticateToken, (req, res) => {
  try {
    const classes = db.prepare('SELECT * FROM classes WHERE user_id = ? ORDER BY created_at').all(req.userId);
    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Server error fetching classes' });
  }
});

// Add class
app.post('/api/classes', authenticateToken, (req, res) => {
  try {
    const { id, name, color } = req.body;

    db.prepare('INSERT INTO classes (id, user_id, name, color) VALUES (?, ?, ?, ?)').run(id, req.userId, name, color);

    res.status(201).json({ message: 'Class created' });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Server error creating class' });
  }
});

// Update class
app.put('/api/classes/:id', authenticateToken, (req, res) => {
  try {
    const { name, color } = req.body;

    db.prepare('UPDATE classes SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(name, color, req.params.id, req.userId);

    res.json({ message: 'Class updated' });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Server error updating class' });
  }
});

// Delete class
app.delete('/api/classes/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM classes WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ message: 'Class deleted' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Server error deleting class' });
  }
});

// ==================== CLASS MODULES ROUTES ====================

// Get all modules
app.get('/api/modules', authenticateToken, (req, res) => {
  try {
    const modules = db.prepare('SELECT * FROM class_modules WHERE user_id = ? ORDER BY class_id, module_number').all(req.userId);

    modules.forEach(module => {
      module.completed = Boolean(module.completed);
    });

    res.json(modules);
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ error: 'Server error fetching modules' });
  }
});

// Add module
app.post('/api/modules', authenticateToken, (req, res) => {
  try {
    const { id, class_id, module_number, name, week_number, status, completed } = req.body;

    db.prepare(`
      INSERT INTO class_modules (id, user_id, class_id, module_number, name, week_number, status, completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.userId, class_id, module_number, name, week_number || null, status || 'pending', completed ? 1 : 0);

    res.status(201).json({ message: 'Module created' });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Server error creating module' });
  }
});

// Update module
app.put('/api/modules/:id', authenticateToken, (req, res) => {
  try {
    const { class_id, module_number, name, week_number, status, completed } = req.body;

    db.prepare(`
      UPDATE class_modules
      SET class_id = ?, module_number = ?, name = ?, week_number = ?, status = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(class_id, module_number, name, week_number || null, status, completed ? 1 : 0, req.params.id, req.userId);

    res.json({ message: 'Module updated' });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Server error updating module' });
  }
});

// Delete module
app.delete('/api/modules/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM class_modules WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ message: 'Module deleted' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Server error deleting module' });
  }
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});
