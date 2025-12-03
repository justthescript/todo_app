# Deployment Guide

This guide explains how to deploy the Todo App with authentication using a split deployment strategy:
- **Frontend**: GitHub Pages (free, static hosting)
- **Backend**: Render (free tier available)

## Architecture Overview

```
GitHub Pages (Frontend)          Render (Backend)
┌─────────────────────┐         ┌──────────────────┐
│  HTML/CSS/JS Files  │ ───────>│  Node.js Server  │
│  (Static)           │  API    │  Express + SQLite│
└─────────────────────┘ Calls   └──────────────────┘
```

## Prerequisites

- GitHub account
- Render account (free at https://render.com)
- Git installed locally

---

## Part 1: Deploy Backend to Render

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up for a free account (you can use GitHub to sign in)

### Step 2: Deploy Backend

#### Option A: Using render.yaml (Recommended)
1. Push your code to GitHub (if not already done)
2. Go to https://dashboard.render.com/
3. Click **"New +"** → **"Blueprint"**
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and create the service
6. Click **"Apply"** to deploy

#### Option B: Manual Deployment
1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `todo-app-backend` (or your choice)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

5. Add Environment Variables:
   - Click **"Advanced"**
   - Add these environment variables:
     ```
     NODE_ENV=production
     JWT_SECRET=[click "Generate" for a secure random value]
     FRONTEND_URL=https://justthescript.github.io/todo_app
     ```

6. Click **"Create Web Service"**

### Step 3: Note Your Backend URL
After deployment completes, you'll get a URL like:
```
https://todo-app-backend-xxxx.onrender.com
```

**IMPORTANT**: Copy this URL - you'll need it in the next step!

### Step 4: Test Your Backend
Visit your backend URL in a browser:
```
https://your-app-name.onrender.com/
```

You should see the login page being served by the backend.

---

## Part 2: Deploy Frontend to GitHub Pages

### Step 1: Update config.js with Your Backend URL

1. Open `config.js` in your repository
2. Update line 12 with your actual Render backend URL:

```javascript
production: {
  // Replace with your actual Render backend URL
  API_URL: 'https://your-app-name.onrender.com/api'
}
```

### Step 2: Commit and Push Changes

```bash
git add config.js
git commit -m "Update production API URL"
git push origin main
```

### Step 3: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - Branch: `main` (or your default branch)
   - Folder: `/ (root)`
4. Click **Save**

### Step 4: Wait for Deployment
GitHub will build and deploy your site. This usually takes 1-2 minutes.

Your site will be available at:
```
https://justthescript.github.io/todo_app/
```

---

## Part 3: Verify Deployment

### Test the Full Stack

1. Visit your GitHub Pages URL:
   ```
   https://justthescript.github.io/todo_app/login.html
   ```

2. Try creating an account:
   - Enter an email and password
   - Click "Sign Up"
   - If successful, you'll be redirected to the main app

3. Check browser console (F12) for any errors

### Common Issues

**"Network error. Please try again."**
- Check that `config.js` has the correct Render backend URL
- Check browser console for CORS errors
- Verify backend is running on Render

**CORS Error**
- Make sure `FRONTEND_URL` in Render is set to your GitHub Pages URL
- Check that it matches exactly (including https://)

**"Server error during registration"**
- Check Render logs: Dashboard → Your Service → Logs
- Verify `JWT_SECRET` is set in Render environment variables

---

## Local Development

To run locally after these changes:

1. Make sure `.env` file exists with:
   ```
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-local-secret
   FRONTEND_URL=http://localhost:3000
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Visit:
   ```
   http://localhost:3000/login.html
   ```

The app will automatically use `http://localhost:3000/api` when running locally.

---

## Environment Variables Reference

### Backend (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | Secret for JWT tokens | Generate in Render |
| `FRONTEND_URL` | Frontend URL for CORS | `https://justthescript.github.io/todo_app` |
| `PORT` | Server port (auto-set by Render) | `10000` |

### Frontend (config.js)

| Setting | Description | Example |
|---------|-------------|---------|
| `production.API_URL` | Backend API URL | `https://your-app.onrender.com/api` |
| `development.API_URL` | Local API URL | `http://localhost:3000/api` |

---

## Updating Your App

### To Update Backend
1. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "Update backend"
   git push
   ```
2. Render will automatically redeploy (if auto-deploy is enabled)

### To Update Frontend
1. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "Update frontend"
   git push
   ```
2. GitHub Pages will automatically rebuild and deploy

---

## Cost

Both services offer free tiers:

- **GitHub Pages**: Free for public repositories
- **Render Free Tier**:
  - 750 hours/month (enough for continuous running)
  - Spins down after 15 min of inactivity
  - First request may take 30-60 seconds (cold start)

---

## Database

The SQLite database (`database.db`) is stored on Render's filesystem. Note:

⚠️ **Important**: On the free tier, the database will be reset if:
- The service restarts
- Render redeploys your app
- The service is inactive for 90 days

For production use with persistent data, consider upgrading to a paid Render plan or using an external database (PostgreSQL, MongoDB Atlas, etc.).

---

## Troubleshooting

### Check Backend Logs
1. Go to Render Dashboard
2. Select your service
3. Click "Logs" tab
4. Look for errors

### Check Frontend Console
1. Open your app in browser
2. Press F12 to open Developer Tools
3. Click "Console" tab
4. Look for errors

### Test API Directly
```bash
# Test backend health
curl https://your-app.onrender.com/

# Test registration
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

---

## Security Notes

1. **Never commit `.env` file** - it's already in `.gitignore`
2. **Use strong JWT_SECRET** - let Render generate it
3. **Use HTTPS** - both GitHub Pages and Render provide this automatically
4. **Environment Variables** - sensitive data is stored in Render, not in code

---

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Render logs for backend errors
3. Verify all environment variables are set correctly
4. Make sure URLs in `config.js` are correct

---

**Happy Deploying! 🚀**
