/**
 * TaskFlow State Management & Local Storage Persistence
 * Architecture: Unidirectional data flow, observable state, full CRUD
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'taskflow_tasks_v2';
  const THEME_STORAGE_KEY = 'taskflow_theme_pref';

  // Default seed tasks if user opens app for the first time
  const DEFAULT_SEEDS = [
    {
      id: 'task-seed-1',
      title: 'Review WCAG 2.2 accessibility checklist & landmark roles',
      completed: true,
      priority: 'high',
      category: 'Work',
      dueDate: '',
      createdAt: Date.now() - 86400000,
      completedAt: Date.now() - 43200000
    },
    {
      id: 'task-seed-2',
      title: 'Test keyboard navigation and tab index cycling in form',
      completed: false,
      priority: 'medium',
      category: 'Work',
      dueDate: '',
      createdAt: Date.now() - 3600000,
      completedAt: null
    },
    {
      id: 'task-seed-3',
      title: 'Double-click any task text to activate inline editing',
      completed: false,
      priority: 'low',
      category: 'Personal',
      dueDate: '',
      createdAt: Date.now() - 1800000,
      completedAt: null
    }
  ];

  class StateManager {
    constructor() {
      this.state = {
        tasks: [],
        filter: 'all',          // 'all' | 'active' | 'completed'
        searchQuery: '',
        sortBy: 'created-desc'  // 'created-desc' | 'created-asc' | 'priority-desc' | 'alpha-asc'
      };

      this.listeners = [];
      this.load();
    }

    /**
     * Subscribe a callback to state change events
     */
    subscribe(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    }

    /**
     * Notify all subscribers when state changes
     */
    notify() {
      this.listeners.forEach((callback) => callback(this.state));
    }

    /**
     * Load tasks from window.localStorage
     */
    load() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.state.tasks = parsed;
          } else {
            this.state.tasks = [...DEFAULT_SEEDS];
          }
        } else {
          this.state.tasks = [...DEFAULT_SEEDS];
          this.save();
        }
      } catch (err) {
        console.warn('TaskFlow: localStorage load failed or restricted, falling back to seeds.', err);
        this.state.tasks = [...DEFAULT_SEEDS];
      }
    }

    /**
     * Persist tasks to window.localStorage
     */
    save() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.tasks));
      } catch (err) {
        console.error('TaskFlow: localStorage save failed (quota exceeded or restricted).', err);
      }
    }

    /* ------------------------------------------------------------------------
       CRUD Functionality: Create, Read, Update, Delete
       ------------------------------------------------------------------------ */

    /**
     * CREATE: Add a new task item
     */
    addTask({ title, priority = 'medium', category = 'General', dueDate = '' }) {
      const trimmedTitle = (title || '').trim();
      if (!trimmedTitle) {
        throw new Error('Task title cannot be empty.');
      }

      const newTask = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        title: trimmedTitle,
        completed: false,
        priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
        category: category.trim() || 'General',
        dueDate: dueDate || '',
        createdAt: Date.now(),
        completedAt: null
      };

      // Prepend to top of list
      this.state.tasks.unshift(newTask);
      this.save();
      this.notify();
      return newTask;
    }

    /**
     * UPDATE: Toggle task completion status
     */
    toggleTask(id) {
      const task = this.state.tasks.find((t) => t.id === id);
      if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? Date.now() : null;
        this.save();
        this.notify();
      }
    }

    /**
     * UPDATE: Update task properties (title, priority, category, etc.)
     */
    updateTask(id, updates = {}) {
      const task = this.state.tasks.find((t) => t.id === id);
      if (!task) return null;

      if (updates.title !== undefined) {
        const trimmed = updates.title.trim();
        if (!trimmed) {
          // If empty, delete task as per modern to-do specs
          return this.deleteTask(id);
        }
        task.title = trimmed;
      }

      if (updates.priority && ['low', 'medium', 'high'].includes(updates.priority)) {
        task.priority = updates.priority;
      }

      if (updates.category !== undefined) {
        task.category = updates.category.trim() || 'General';
      }

      if (updates.dueDate !== undefined) {
        task.dueDate = updates.dueDate;
      }

      this.save();
      this.notify();
      return task;
    }

    /**
     * UPDATE: Toggle all tasks as completed or active
     */
    toggleAll() {
      const allCompleted = this.state.tasks.length > 0 && this.state.tasks.every((t) => t.completed);
      const newState = !allCompleted;
      const now = Date.now();

      this.state.tasks.forEach((task) => {
        task.completed = newState;
        task.completedAt = newState ? now : null;
      });

      this.save();
      this.notify();
    }

    /**
     * DELETE: Remove a task by ID
     */
    deleteTask(id) {
      const initialLength = this.state.tasks.length;
      this.state.tasks = this.state.tasks.filter((t) => t.id !== id);
      if (this.state.tasks.length !== initialLength) {
        this.save();
        this.notify();
        return true;
      }
      return false;
    }

    /**
     * DELETE: Bulk delete all completed tasks
     */
    clearCompleted() {
      this.state.tasks = this.state.tasks.filter((t) => !t.completed);
      this.save();
      this.notify();
    }

    /* ------------------------------------------------------------------------
       Filter & Search State Setters
       ------------------------------------------------------------------------ */

    setFilter(filter) {
      if (['all', 'active', 'completed'].includes(filter)) {
        this.state.filter = filter;
        this.notify();
      }
    }

    setSearchQuery(query) {
      this.state.searchQuery = (query || '').toLowerCase().trim();
      this.notify();
    }

    setSortBy(sortBy) {
      this.state.sortBy = sortBy;
      this.notify();
    }

    /* ------------------------------------------------------------------------
       READ: Data Computations & View Models
       ------------------------------------------------------------------------ */

    /**
     * Get computed filtered and sorted tasks array
     */
    getFilteredTasks() {
      let result = [...this.state.tasks];

      // 1. Status Filter
      if (this.state.filter === 'active') {
        result = result.filter((t) => !t.completed);
      } else if (this.state.filter === 'completed') {
        result = result.filter((t) => t.completed);
      }

      // 2. Keyword Search Query
      if (this.state.searchQuery) {
        const query = this.state.searchQuery;
        result = result.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.category.toLowerCase().includes(query)
        );
      }

      // 3. Sorting Strategy
      const priorityWeights = { high: 3, medium: 2, low: 1 };

      switch (this.state.sortBy) {
        case 'created-asc':
          result.sort((a, b) => a.createdAt - b.createdAt);
          break;
        case 'priority-desc':
          result.sort((a, b) => (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0));
          break;
        case 'alpha-asc':
          result.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'created-desc':
        default:
          result.sort((a, b) => b.createdAt - a.createdAt);
          break;
      }

      return result;
    }

    /**
     * Get real-time summary statistics
     */
    getStats() {
      const total = this.state.tasks.length;
      const completed = this.state.tasks.filter((t) => t.completed).length;
      const active = total - completed;
      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        total,
        completed,
        active,
        percent
      };
    }

    /* ------------------------------------------------------------------------
       Data Portability: Export & Import JSON
       ------------------------------------------------------------------------ */

    exportJSON() {
      return JSON.stringify(this.state.tasks, null, 2);
    }

    importJSON(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed)) {
          throw new Error('Imported JSON must be an array of task items.');
        }

        // Validate basic task structure
        const validated = parsed.filter(
          (item) => item && typeof item === 'object' && typeof item.title === 'string'
        ).map((item) => ({
          id: item.id || 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          title: item.title.trim(),
          completed: Boolean(item.completed),
          priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
          category: item.category || 'General',
          dueDate: item.dueDate || '',
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
          completedAt: item.completedAt || null
        }));

        this.state.tasks = validated;
        this.save();
        this.notify();
        return { success: true, count: validated.length };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  }

  // Expose global TaskFlow state manager
  window.TaskFlow = window.TaskFlow || {};
  window.TaskFlow.StateManager = StateManager;
  window.TaskFlow.THEME_STORAGE_KEY = THEME_STORAGE_KEY;
})(window);
