# TaskFlow | State-Driven To-Do Application

An interactive, client-side task management application built with pure Vanilla JavaScript to master **unidirectional state management**, **DOM manipulation**, **event delegation**, and **browser `window.localStorage` persistence**.

---

## 🌟 Key Architecture & Features

### 1. Full CRUD Implementation
- **Create**: Add tasks with title, priority (`high`, `medium`, `low`), category tag (`Work`, `Personal`, `Study`, `Urgent`), and optional due date. Includes form validation with feedback.
- **Read**: Dynamic rendering of tasks with animated progress bar, live completion statistics, priority badges, and formatted dates.
- **Update**:
  - Checkbox toggle for active/completed states.
  - Inline editing: <kbd>Double-click</kbd> or click the edit icon to transform the task title into an editable input in-place.
  - <kbd>Enter</kbd> commits updates, <kbd>Escape</kbd> cancels changes.
  - "Toggle All" bulk state switcher.
- **Delete**:
  - Individual item removal with hover-accessible action button.
  - "Clear Completed" bulk purge.
  - Clearing text during inline edit automatically deletes the item.

### 2. Local Data Persistence (`window.localStorage`)
- **Auto-Sync**: Every state mutation (`addTask`, `toggleTask`, `updateTask`, `deleteTask`, `clearCompleted`) automatically synchronizes to `window.localStorage.getItem('taskflow_tasks_v2')`.
- **First-Run Seed Data**: Pre-loads default tasks on initial launch for an immediate out-of-the-box experience.
- **Fault-Tolerant Parsing**: Validates JSON schema upon load, guarding against corrupted storage data.
- **Data Portability**: Full JSON export and import capabilities for backup and migration.

### 3. Advanced Filtering & Sorting
- **Status Filter Tabs**: `All`, `Active`, and `Completed` with dynamic badge counters.
- **Live Search Query**: Debounced instant search filtering across both task titles and categories.
- **Multi-Criteria Sorting**:
  - Newest First (Creation Date descending)
  - Oldest First (Creation Date ascending)
  - Priority (High $\to$ Medium $\to$ Low)
  - Alphabetical (A $\to$ Z)

### 4. DOM Manipulation & Event Delegation
- **Single Source of Truth**: State transitions trigger a single reactive `render(state)` cycle via an observer pattern.
- **Event Delegation**: Instead of attaching listeners to each dynamic list item, a single event listener is attached to the parent `#task-list` container, intercepting bubble events for `.task-toggle`, `.action-btn-delete`, `.action-btn-edit`, and `.task-title`.
- **Zero Memory Leaks**: Dynamic elements can be freely mounted and unmounted without leaving dangling event handlers.

### 5. Keyboard Accessibility & Theme Tokens
- Skip link navigation for screen reader and keyboard users.
- Accessible focus outlines with high-contrast `:focus-visible`.
- Full keyboard operability (<kbd>Tab</kbd>, <kbd>Enter</kbd>, <kbd>Escape</kbd>).
- Dynamic Light and Dark mode theme with persistent user preference.

---

## 📁 File Structure

```
todo-app/
├── index.html        # Accessible HTML5 semantic structure & landmarks
├── css/
│   └── styles.css    # Glassmorphism, CSS variables, dark/light themes, animations
├── js/
│   ├── state.js      # StateManager class, localStorage persistence & CRUD methods
│   └── app.js        # DOM controller, event delegation, search & keyboard interactions
└── README.md         # Architecture documentation and user manual
```

---

## 🚀 How to Run Locally

Double-click [`index.html`](file:///C:/Users/rampr/.gemini/antigravity/scratch/todo-app/index.html) to open directly in any web browser, or serve locally with PowerShell:

```powershell
cd C:\Users\rampr\.gemini\antigravity\scratch\todo-app
Start-Process "http://localhost:8080"
# (Use your favorite local server or open index.html directly)
```
