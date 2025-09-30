# TaskDash - Todo List Web App

A modern, responsive todo list application built with vanilla JavaScript and Firebase backend.

## Backend Choice

Firebase (Google Cloud)

We chose Firebase as our Backend-as-a-Service (BaaS) solution because:

- Real-time Database: Firestore provides real-time synchronization across devices
- Authentication: Built-in user authentication with anonymous sign-in
- Scalability: Automatically scales with usage
- No Server Management: Fully managed backend service
- Free Tier: Generous free usage limits for development and small projects
- Easy Integration: Simple JavaScript SDK for web applications

## How to Run the Web App

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for Firebase services)
- Web server (for local development)

### Local Development Setup

1. Clone the Repository
   ```bash
   git clone https://github.com/Apong516/cmsc128-PairProject_Erazo_Buerom.git
   cd "Downloads/todo app"
   ```

2. Serve the Files
   
   Option A: Using Python
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   Option B: Using Node.js
   ```bash
   npx http-server
   ```
   
   Option C: Using VS Code Live Server
   - Install Live Server extension
   - Right-click on `index.html`
   - Select "Open with Live Server"

3. Access the Application
   - Open browser and navigate to `http://localhost:8000`
   - The app will automatically sign in anonymously

### Production Deployment

Deploy to any static hosting service:
- GitHub Pages: Enable in repository settings
- Netlify: Connect your GitHub repository
- Vercel: Deploy with one click
- Firebase Hosting: Use Firebase CLI

## Firebase Configuration

The app uses the following Firebase services:

### Firestore Database Structure
```javascript
// Collection: "tasks"
{
  id: "auto-generated-id",
  userId: "anonymous-user-id",
  title: "Task title",
  description: "Optional description",
  priority: "High" | "Mid" | "Low",
  status: "not_started" | "in_progress" | "done",
  createdAt: timestamp,
  dueAt: timestamp | null,
  dueText: "Optional due date text",
  isDeleted: boolean,
  deletedAt: timestamp | null
}
```

### Authentication
- Anonymous Authentication: Users are automatically signed in
- User Management: Each user gets a unique anonymous ID
- Local Storage: User preferences stored locally

## API Endpoints (Firebase SDK)

The application uses Firebase SDK which abstracts the REST API. Here are the equivalent operations:

### Authentication Endpoints
```javascript
// Anonymous Sign In
onAuthStateChanged(auth, callback)
signInAnonymously(auth)
signOut(auth)
```

### Task Management Endpoints
```javascript
// Create Task
addDoc(collection(db, "tasks"), taskData)
// Equivalent to: POST /v1/projects/taskdash-c5cc1/databases/(default)/documents/tasks

// Read Tasks (Real-time)
onSnapshot(query(collection(db, "tasks"), where("userId", "==", userId)), callback)
// Equivalent to: GET /v1/projects/taskdash-c5cc1/databases/(default)/documents/tasks

// Update Task
updateDoc(doc(db, "tasks", taskId), updateData)
// Equivalent to: PATCH /v1/projects/taskdash-c5cc1/databases/(default)/documents/tasks/{taskId}

// Delete Task
deleteDoc(doc(db, "tasks", taskId))
// Equivalent to: DELETE /v1/projects/taskdash-c5cc1/databases/(default)/documents/tasks/{taskId}
```

### Example API Usage in Code
```javascript
// Create a new task
const createTask = async (taskData) => {
  const docRef = await addDoc(collection(db, "tasks"), {
    userId: user.uid,
    title: "Complete project",
    description: "Finish the CMSC 128 lab",
    priority: "High",
    status: "not_started",
    createdAt: Date.now(),
    dueAt: null,
    dueText: "Next week",
    isDeleted: false,
    deletedAt: null
  });
  return docRef.id;
};

// Update task status
const updateTaskStatus = async (taskId, newStatus) => {
  await updateDoc(doc(db, "tasks", taskId), {
    status: newStatus
  });
};

// Soft delete task
const softDeleteTask = async (taskId) => {
  await updateDoc(doc(db, "tasks", taskId), {
    isDeleted: true,
    deletedAt: Date.now()
  });
};

// Listen for real-time updates
const listenToTasks = (userId, callback) => {
  const q = query(
    collection(db, "tasks"), 
    where("userId", "==", userId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tasks);
  });
};
```

## Features

-  Task Management: Create, read, update, delete tasks
-  Real-time Sync: Changes sync across all browser tabs
-  Priority Levels: High, Medium, Low priority tasks
-  Status Tracking: Not Started, In Progress, Completed
-  Search & Filter: Find tasks quickly
-  Sort Options: By date, priority, status
-  Responsive Design: Works on desktop and mobile
-  Profile Management: Upload profile photos
-  Undo Actions: Restore deleted tasks
-  Progress Visualization: Donut charts for task status
-  Due Date Support: Set due dates and times

## Technical Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript (ES6+)
- Backend: Firebase (Firestore + Authentication)
- Styling: CSS Custom Properties, Flexbox, Grid
- Icons: Unicode Emojis
- Real-time: Firebase onSnapshot listeners
- Storage: localStorage for user preferences

##  Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

##  Team

- Full Stack Development: Rei Jansen Buerom
- Full Stack Development: John Romson Erazo

##  License

This assignment is part of CMSC 128 coursework at University of the Philippines Visayas.

---

Course: CMSC 128 - Introduction to Software Engineering  
Institution: University of the Philippines Visayas  
Academic Year: 2025-2026
