/**
 * TaskFlow App Controller
 * Handles DOM manipulation, event delegation, inline editing, and keyboard accessibility.
 */

(function (window, document) {
  'use strict';

  // Instantiate State Management
  const store = new window.TaskFlow.StateManager();

  // DOM Elements Cache
  const form = document.getElementById('new-task-form');
  const titleInput = document.getElementById('task-title-input');
  const prioritySelect = document.getElementById('task-priority-select');
  const categorySelect = document.getElementById('task-category-select');
  const dueDateInput = document.getElementById('task-due-date');
  const inputError = document.getElementById('input-error');

  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const emptyTitle = document.getElementById('empty-title');
  const emptyDesc = document.getElementById('empty-desc');

  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const sortSelect = document.getElementById('sort-select');

  const filterTabs = document.querySelectorAll('.filter-tab');
  const countAll = document.getElementById('count-all');
  const countActive = document.getElementById('count-active');
  const countCompleted = document.getElementById('count-completed');
  const itemsLeftCount = document.getElementById('items-left-count');

  const progressText = document.getElementById('progress-text');
  const progressBarFill = document.getElementById('progress-bar-fill');

  const toggleAllBtn = document.getElementById('toggle-all-btn');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const importJsonInput = document.getElementById('import-json-input');

  const themeToggle = document.getElementById('theme-toggle');

  /**
   * Helper: Escape HTML strings to prevent XSS
   */
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Helper: Format due dates nicely (e.g. "Oct 31")
   */
  function formatDueDate(isoString) {
    if (!isoString) return '';
    try {
      const parts = isoString.split('-');
      if (parts.length === 3) {
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
    } catch (e) {
      return isoString;
    }
    return isoString;
  }

  /* --------------------------------------------------------------------------
     1. Reactive DOM Rendering
     -------------------------------------------------------------------------- */

  function render(state) {
    const tasks = store.getFilteredTasks();
    const stats = store.getStats();

    // 1. Update Counts & Badges
    countAll.textContent = stats.total;
    countActive.textContent = stats.active;
    countCompleted.textContent = stats.completed;
    itemsLeftCount.innerHTML = `<strong>${stats.active}</strong> item${stats.active === 1 ? '' : 's'} remaining`;

    // 2. Update Progress Bar
    progressText.textContent = `${stats.completed} / ${stats.total} Done (${stats.percent}%)`;
    progressBarFill.style.width = `${stats.percent}%`;

    // 3. Update Filter Tabs ARIA state
    filterTabs.forEach((tab) => {
      const tabFilter = tab.getAttribute('data-filter');
      const isActive = tabFilter === state.filter;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    // 4. Update Clear Completed Button visibility
    clearCompletedBtn.style.display = stats.completed > 0 ? 'inline-flex' : 'none';

    // 5. Render Task List or Empty State
    if (tasks.length === 0) {
      taskList.innerHTML = '';
      taskList.style.display = 'none';
      emptyState.style.display = 'flex';

      if (state.searchQuery) {
        emptyTitle.textContent = 'No matching tasks found';
        emptyDesc.textContent = `No tasks matched your search "${state.searchQuery}". Try a different keyword or clear search.`;
      } else if (state.filter === 'active') {
        emptyTitle.textContent = 'No active tasks left';
        emptyDesc.textContent = 'You have tackled all active tasks. Great job!';
      } else if (state.filter === 'completed') {
        emptyTitle.textContent = 'No completed tasks yet';
        emptyDesc.textContent = 'Complete some tasks to see them archived here.';
      } else {
        emptyTitle.textContent = 'Your task list is empty';
        emptyDesc.textContent = 'Add your first task above to begin organizing your work!';
      }
      return;
    }

    emptyState.style.display = 'none';
    taskList.style.display = 'block';

    // Build Task Items HTML
    const html = tasks.map((task) => {
      const isCompleted = task.completed;
      const formattedDate = formatDueDate(task.dueDate);

      return `
        <li class="task-item ${isCompleted ? 'is-completed' : ''}" data-id="${task.id}" id="${task.id}">
          <!-- Checkbox Toggle -->
          <label class="custom-checkbox-wrap" aria-label="Mark task '${escapeHTML(task.title)}' as ${isCompleted ? 'active' : 'completed'}">
            <input 
              type="checkbox" 
              class="custom-checkbox-input task-toggle" 
              ${isCompleted ? 'checked' : ''} 
              data-id="${task.id}"
            >
            <span class="custom-checkbox-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </label>

          <!-- Task Content -->
          <div class="task-content">
            <span 
              class="task-title" 
              data-id="${task.id}" 
              tabindex="0" 
              role="button" 
              aria-label="Edit task: ${escapeHTML(task.title)}"
              title="Double-click or press Enter to edit"
            >${escapeHTML(task.title)}</span>

            <div class="task-meta-bar">
              <span class="priority-badge priority-${task.priority}">
                ${task.priority}
              </span>
              <span class="category-tag">
                ${escapeHTML(task.category)}
              </span>
              ${
                formattedDate
                  ? `<span class="due-date-pill" title="Due Date">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      ${formattedDate}
                    </span>`
                  : ''
              }
            </div>
          </div>

          <!-- Actions: Edit & Delete -->
          <div class="task-actions">
            <button 
              type="button" 
              class="action-btn action-btn-edit" 
              data-id="${task.id}" 
              aria-label="Edit task '${escapeHTML(task.title)}'"
              title="Edit Task"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button 
              type="button" 
              class="action-btn action-btn-delete" 
              data-id="${task.id}" 
              aria-label="Delete task '${escapeHTML(task.title)}'"
              title="Delete Task"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </li>
      `;
    }).join('');

    taskList.innerHTML = html;
  }

  /* --------------------------------------------------------------------------
     2. Event Delegation on Task List Container
     -------------------------------------------------------------------------- */

  // Checkbox toggle, delete, and edit triggers
  taskList.addEventListener('click', function (e) {
    const target = e.target;

    // Toggle completion checkbox
    if (target.matches('.task-toggle') || target.closest('.task-toggle')) {
      const checkbox = target.matches('.task-toggle') ? target : target.closest('.task-toggle');
      const id = checkbox.getAttribute('data-id');
      store.toggleTask(id);
      return;
    }

    // Delete task button
    const deleteBtn = target.closest('.action-btn-delete');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      store.deleteTask(id);
      return;
    }

    // Edit task button
    const editBtn = target.closest('.action-btn-edit');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      activateInlineEditing(id);
      return;
    }
  });

  // Double-click to trigger inline edit
  taskList.addEventListener('dblclick', function (e) {
    const titleSpan = e.target.closest('.task-title');
    if (titleSpan) {
      const id = titleSpan.getAttribute('data-id');
      activateInlineEditing(id);
    }
  });

  // Keyboard accessibility for editing (Enter on task title)
  taskList.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList.contains('task-title')) {
      e.preventDefault();
      const id = e.target.getAttribute('data-id');
      activateInlineEditing(id);
    }
  });

  /**
   * Inline Edit Workflow (Update in CRUD)
   */
  function activateInlineEditing(taskId) {
    const taskItem = document.getElementById(taskId);
    if (!taskItem) return;

    const taskObj = store.state.tasks.find((t) => t.id === taskId);
    if (!taskObj) return;

    const contentDiv = taskItem.querySelector('.task-content');
    const titleSpan = contentDiv.querySelector('.task-title');
    const originalText = taskObj.title;

    // Create inline input
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'inline-edit-input';
    editInput.value = originalText;
    editInput.setAttribute('aria-label', 'Edit task title');

    // Replace span with input
    contentDiv.replaceChild(editInput, titleSpan);
    editInput.focus();
    editInput.select();

    let isSaved = false;

    function saveChanges() {
      if (isSaved) return;
      isSaved = true;
      const newText = editInput.value.trim();
      if (newText) {
        store.updateTask(taskId, { title: newText });
      } else {
        // Empty text deletes task
        store.deleteTask(taskId);
      }
    }

    function cancelChanges() {
      if (isSaved) return;
      isSaved = true;
      contentDiv.replaceChild(titleSpan, editInput);
      titleSpan.focus();
    }

    editInput.addEventListener('blur', saveChanges);

    editInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveChanges();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelChanges();
      }
    });
  }

  /* --------------------------------------------------------------------------
     3. Task Creation Form Handling (Create in CRUD)
     -------------------------------------------------------------------------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const titleVal = titleInput.value.trim();
    if (!titleVal) {
      titleInput.classList.add('has-error');
      inputError.textContent = 'Please enter a task description.';
      inputError.style.display = 'block';
      titleInput.focus();
      return;
    }

    // Reset error
    titleInput.classList.remove('has-error');
    inputError.textContent = '';
    inputError.style.display = 'none';

    store.addTask({
      title: titleVal,
      priority: prioritySelect.value,
      category: categorySelect.value,
      dueDate: dueDateInput.value
    });

    // Reset fields & refocus
    titleInput.value = '';
    dueDateInput.value = '';
    titleInput.focus();
  });

  titleInput.addEventListener('input', function () {
    if (titleInput.classList.contains('has-error')) {
      titleInput.classList.remove('has-error');
      inputError.textContent = '';
      inputError.style.display = 'none';
    }
  });

  /* --------------------------------------------------------------------------
     4. Filter Tabs & Search Handling
     -------------------------------------------------------------------------- */

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', function () {
      const filter = this.getAttribute('data-filter');
      store.setFilter(filter);
    });
  });

  // Search input debounced
  let searchTimeout = null;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    const query = this.value;
    clearSearchBtn.classList.toggle('sr-only', !query);
    searchTimeout = setTimeout(function () {
      store.setSearchQuery(query);
    }, 150);
  });

  clearSearchBtn.addEventListener('click', function () {
    searchInput.value = '';
    clearSearchBtn.classList.add('sr-only');
    store.setSearchQuery('');
    searchInput.focus();
  });

  sortSelect.addEventListener('change', function () {
    store.setSortBy(this.value);
  });

  /* --------------------------------------------------------------------------
     5. Bulk Actions & Data Portability
     -------------------------------------------------------------------------- */

  toggleAllBtn.addEventListener('click', function () {
    store.toggleAll();
  });

  clearCompletedBtn.addEventListener('click', function () {
    store.clearCompleted();
  });

  // Export JSON file
  exportJsonBtn.addEventListener('click', function () {
    const jsonStr = store.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `taskflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  });

  // Import JSON file
  importJsonInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const res = store.importJSON(event.target.result);
      if (res.success) {
        alert(`Successfully imported ${res.count} tasks into TaskFlow!`);
      } else {
        alert(`Import failed: ${res.error}`);
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  });

  /* --------------------------------------------------------------------------
     6. Dark / Light Theme Toggle with LocalStorage Persistence
     -------------------------------------------------------------------------- */

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      themeToggle.setAttribute('aria-pressed', 'true');
      themeToggle.setAttribute('aria-label', 'Switch to dark theme');
      themeToggle.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
    } else {
      root.removeAttribute('data-theme');
      themeToggle.setAttribute('aria-pressed', 'false');
      themeToggle.setAttribute('aria-label', 'Switch to light theme');
      themeToggle.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `;
    }

    try {
      window.localStorage.setItem(window.TaskFlow.THEME_STORAGE_KEY, theme);
    } catch (e) {
      // LocalStorage access restricted
    }
  }

  // Detect saved or system theme
  const savedTheme = (function () {
    try {
      return window.localStorage.getItem(window.TaskFlow.THEME_STORAGE_KEY);
    } catch (e) {
      return null;
    }
  })();

  if (savedTheme) {
    applyTheme(savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    applyTheme('light');
  } else {
    applyTheme('dark');
  }

  themeToggle.addEventListener('click', function () {
    const isCurrentLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isCurrentLight ? 'dark' : 'light');
  });

  /* --------------------------------------------------------------------------
     7. Initialize & Subscribe to Store
     -------------------------------------------------------------------------- */

  // Subscribe UI render to State changes
  store.subscribe(render);

  // Initial render
  render(store.state);
})(window, document);
