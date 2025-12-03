# Todo App - Setup Guide

This application now features a complete authentication system and backend API for cross-device synchronization.

## Features Added

✅ **Authentication System**
- User registration and login
- Password reset via email
- JWT-based authentication
- Secure password hashing with bcrypt

✅ **Backend API**
- Node.js + Express server
- SQLite database for data storage
- RESTful API endpoints for all operations
- Cross-device data synchronization

✅ **Enhanced Recurring Tasks**
- No longer adds tasks to past dates
- Confirmation dialog when deleting recurring task series
- Option to remove all generated instances

✅ **Clear All Tasks Feature**
- Removes all tasks from calendar
- Keeps recurring tasks but deactivates them
- Double confirmation for safety

✅ **Module Management** (for School context)
- Mark modules as completed
- Defer modules to different weeks
- Delete modules
- Visual status indicators

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` and configure:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (IMPORTANT: Change this to a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (for password reset)
# For Gmail, you need to:
# 1. Enable 2-factor authentication
# 2. Generate an app-specific password
# 3. Use that password here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Todo App <noreply@todoapp.com>

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000

# Database
DB_PATH=./database.db
```

### 3. Generate a Secure JWT Secret

You can generate a secure random secret using:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET` in the `.env` file.

### 4. Start the Server

```bash
# For development (with auto-reload)
npm run dev

# For production
npm start
```

The server will start on `http://localhost:3000` (or the PORT you specified).

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:3000/login.html
```

## First Time Use

1. **Create an Account**: Click on the "Sign Up" tab and create your account
2. **Login**: Use your credentials to login
3. **Start Using**: You'll be redirected to the main application

## Email Configuration

### Using Gmail

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security > 2-Step Verification > App passwords
4. Generate an app password for "Mail"
5. Use this password in your `.env` file as `EMAIL_PASSWORD`

### Using Other Email Providers

Update the `.env` file with your provider's SMTP settings:
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your provider's settings

## Database

The application uses SQLite for data storage. The database file will be created automatically at `./database.db` (or the path specified in `.env`).

### Database Schema

The database includes tables for:
- Users and authentication
- Tasks (daily tasks with dates)
- Backlog tasks
- Recurring tasks
- Custom statuses and categories
- Classes and modules
- User settings

## API Endpoints

All API endpoints require authentication (except registration and login).

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `DELETE /api/tasks/all/clear` - Clear all tasks

### Recurring Tasks
- `GET /api/recurring-tasks` - Get recurring tasks
- `POST /api/recurring-tasks` - Create recurring task
- `PUT /api/recurring-tasks/:id` - Update recurring task
- `DELETE /api/recurring-tasks/:id` - Delete recurring task

### Classes & Modules
- `GET /api/classes` - Get all classes
- `POST /api/classes` - Create class
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class
- `GET /api/modules` - Get all modules
- `POST /api/modules` - Create module
- `PUT /api/modules/:id` - Update module
- `DELETE /api/modules/:id` - Delete module

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your `.env`
2. Use a strong `JWT_SECRET`
3. Configure proper email settings
4. Consider using PostgreSQL or MySQL instead of SQLite for better performance
5. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name todo-app
   ```
6. Set up HTTPS with a reverse proxy (nginx, Apache, etc.)
7. Regular database backups

## Troubleshooting

### "Failed to load data" error
- Check that the server is running
- Verify your `.env` configuration
- Check server logs for errors

### Email not sending
- Verify SMTP credentials
- Check that 2FA and app passwords are configured (for Gmail)
- Look at server logs for specific email errors

### Database errors
- Ensure the database directory is writable
- Check that SQLite is properly installed
- Delete `database.db` to reset (WARNING: This deletes all data)

## Development

The project structure:
```
/todo_app
├── server.js           # Main server file
├── database.js         # Database initialization
├── middleware/
│   └── auth.js        # Authentication middleware
├── api.js             # Frontend API client
├── script.js          # Main application logic
├── styles.css         # Application styles
├── index.html         # Main application page
├── login.html         # Login/signup page
├── reset-password.html # Password reset page
└── .env               # Configuration (not in git)
```

## Security Notes

- JWT tokens expire after 30 days
- Passwords are hashed using bcrypt
- Password reset tokens expire after 1 hour
- Always use HTTPS in production
- Keep your `.env` file secure and never commit it to version control

## Support

For issues or questions, please check:
1. Server logs for error messages
2. Browser console for frontend errors
3. This documentation for configuration help

---

**Note**: This is a significant upgrade from the localStorage-based version. All data is now stored securely on the server and accessible from any device.
