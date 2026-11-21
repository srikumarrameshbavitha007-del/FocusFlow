/* ═══════════════════════════════════════════════
   FOCUSFLOW – script.js
   Handles: tasks, filters, progress, modal, date,
            localStorage persistence
═══════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   STORAGE KEY – single source of truth for the
   localStorage key name used throughout the app
────────────────────────────────────────────── */
const STORAGE_KEY = 'focusflow_tasks';


/* ──────────────────────────────────────────────
   SAVE TASKS – Serialise the tasks array to JSON
   and write it to localStorage.
   Called every time tasks change.
────────────────────────────────────────────── */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    // localStorage may be unavailable (e.g. private browsing quota exceeded).
    // Fail silently so the rest of the app keeps working.
    console.warn('FocusFlow: could not save to localStorage.', err);
  }
}


/* ──────────────────────────────────────────────
   LOAD TASKS – Read and parse tasks from
   localStorage.  Returns true if saved tasks
   were found, false if storage was empty or
   the data could not be parsed.
────────────────────────────────────────────── */
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Basic guard: make sure we got an array
      if (Array.isArray(parsed) && parsed.length > 0) {
        tasks = parsed;
        return true; // Successfully loaded saved tasks
      }
    }
  } catch (err) {
    // Corrupted JSON or localStorage unavailable – start fresh.
    console.warn('FocusFlow: could not read from localStorage.', err);
  }
  return false; // No saved tasks found
}

/* ──────────────────────────────────────────────
   STATE
   All task data lives in this array.
   Each task object looks like:
   {
     id:        string   – unique identifier
     title:     string   – task name
     subject:   string   – subject/category
     priority:  string   – 'low' | 'medium' | 'high'
     dueDate:   string   – ISO date string or ''
     completed: boolean  – done or not
     createdAt: number   – timestamp
   }
────────────────────────────────────────────── */
let tasks = [];

// Which filter tab is active: 'all' | 'pending' | 'completed'
let activeFilter = 'all';


/* ──────────────────────────────────────────────
   HELPER – Generate a simple unique ID
────────────────────────────────────────────── */
function generateId() {
  return '_' + Math.random().toString(36).slice(2, 9);
}


/* ──────────────────────────────────────────────
   DATE – Show today's date in the header
────────────────────────────────────────────── */
function setCurrentDate() {
  const dateEl = document.getElementById('currentDate');
  if (!dateEl) return;

  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateEl.textContent = now.toLocaleDateString('en-US', options);
}


/* ──────────────────────────────────────────────
   GREETING – Changes based on the time of day
────────────────────────────────────────────── */
function setGreeting() {
  const h1 = document.querySelector('.top-bar-title h1');
  if (!h1) return;

  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';

  h1.textContent = `${greeting}, Student! 👋`;
}


/* ──────────────────────────────────────────────
   PROGRESS – Update the progress bar & counters
────────────────────────────────────────────── */
function updateProgress() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending   = total - completed;
  const percent   = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Progress bar
  const fill  = document.getElementById('progressBarFill');
  const track = document.getElementById('progressBarTrack');
  const pct   = document.getElementById('progressPercent');
  const sub   = document.getElementById('progressSub');

  if (fill)  fill.style.width = percent + '%';
  if (track) track.setAttribute('aria-valuenow', percent);
  if (pct)   pct.textContent  = percent + '%';
  if (sub)   sub.textContent  = `${completed} of ${total} task${total !== 1 ? 's' : ''} completed`;

  // Stat counters
  const totalEl   = document.getElementById('totalCount');
  const pendingEl = document.getElementById('pendingCount');
  const doneEl    = document.getElementById('doneCount');

  if (totalEl)   totalEl.textContent   = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (doneEl)    doneEl.textContent    = completed;
}


/* ──────────────────────────────────────────────
   RENDER – Build and show the task cards
────────────────────────────────────────────── */
function renderTasks() {
  const taskList  = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  if (!taskList) return;

  // Filter tasks based on active tab
  const filtered = tasks.filter(task => {
    if (activeFilter === 'pending')   return !task.completed;
    if (activeFilter === 'completed') return  task.completed;
    return true; // 'all'
  });

  // Clear and re-render
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');

    filtered.forEach(task => {
      const card = createTaskCard(task);
      taskList.appendChild(card);
    });
  }

  updateProgress();
}


/* ──────────────────────────────────────────────
   CREATE CARD – Build a single task card element
────────────────────────────────────────────── */
function createTaskCard(task) {
  // Wrapper article element
  const card = document.createElement('article');
  card.className = `task-card priority-${task.priority}${task.completed ? ' completed' : ''}`;
  card.setAttribute('data-id', task.id);
  card.setAttribute('aria-label', `Task: ${task.title}`);

  // ── Checkbox ──
  const checkbox = document.createElement('button');
  checkbox.className = `task-checkbox${task.completed ? ' checked' : ''}`;
  checkbox.setAttribute('aria-label', task.completed ? 'Mark as pending' : 'Mark as complete');
  checkbox.setAttribute('title', task.completed ? 'Mark as pending' : 'Mark as complete');
  checkbox.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"
         stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`;

  checkbox.addEventListener('click', () => toggleTask(task.id));

  // ── Task Body ──
  const body = document.createElement('div');
  body.className = 'task-body';

  // Title
  const title = document.createElement('p');
  title.className = 'task-title';
  title.textContent = task.title;
  title.title = task.title;

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'task-meta';

  // Subject tag
  if (task.subject) {
    const subject = document.createElement('span');
    subject.className = 'task-subject';
    subject.textContent = task.subject;
    meta.appendChild(subject);
  }

  // Due date
  if (task.dueDate) {
    const due = document.createElement('span');
    due.className = 'task-due';
    due.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      ${formatDate(task.dueDate)}`;
    meta.appendChild(due);
  }

  body.appendChild(title);
  body.appendChild(meta);

  // ── Priority Badge ──
  const badge = document.createElement('span');
  badge.className = `priority-badge ${task.priority}`;
  const priorityLabels = { low: '🟢 Low', medium: '🟡 Medium', high: '🔴 High' };
  badge.textContent = priorityLabels[task.priority] || task.priority;

  // ── Delete Button ──
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'task-delete';
  deleteBtn.setAttribute('aria-label', `Delete task: ${task.title}`);
  deleteBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>`;

  deleteBtn.addEventListener('click', () => deleteTask(task.id));

  // Assemble card
  card.appendChild(checkbox);
  card.appendChild(body);
  card.appendChild(badge);
  card.appendChild(deleteBtn);

  return card;
}


/* ──────────────────────────────────────────────
   FORMAT DATE – e.g. "Nov 25" or "Nov 25, 2027"
────────────────────────────────────────────── */
function formatDate(isoString) {
  if (!isoString) return '';
  // Parse as local date to avoid timezone shifts
  const [year, month, day] = isoString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const thisYear = new Date().getFullYear();

  const opts = { month: 'short', day: 'numeric' };
  if (date.getFullYear() !== thisYear) opts.year = 'numeric';

  return date.toLocaleDateString('en-US', opts);
}


/* ──────────────────────────────────────────────
   TOGGLE TASK – Mark complete / pending
────────────────────────────────────────────── */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks(); // Persist the updated completion status
  renderTasks();
}


/* ──────────────────────────────────────────────
   DELETE TASK – Remove a task by id
────────────────────────────────────────────── */
function deleteTask(id) {
  // Animate the card out before removing
  const card = document.querySelector(`.task-card[data-id="${id}"]`);
  if (card) {
    card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    card.style.opacity  = '0';
    card.style.transform = 'translateX(20px)';
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks(); // Persist the deletion
      renderTasks();
    }, 200);
  } else {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(); // Persist the deletion
    renderTasks();
  }
}


/* ──────────────────────────────────────────────
   ADD TASK – Called on form submit
────────────────────────────────────────────── */
function addTask(title, subject, priority, dueDate) {
  const newTask = {
    id:        generateId(),
    title:     title.trim(),
    subject:   subject.trim(),
    priority:  priority,
    dueDate:   dueDate,
    completed: false,
    createdAt: Date.now()
  };

  tasks.unshift(newTask); // Add to the top of the list
  saveTasks(); // Persist the new task
  renderTasks();
}


/* ──────────────────────────────────────────────
   MODAL – Open & Close
────────────────────────────────────────────── */
function openModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  // Focus the first input field for accessibility
  setTimeout(() => {
    document.getElementById('taskName').focus();
  }, 100);
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('open');
  resetForm();
}

function resetForm() {
  document.getElementById('taskForm').reset();
  document.getElementById('taskNameError').textContent = '';
  // Reset priority to 'low'
  document.getElementById('priorityLow').checked = true;
}


/* ──────────────────────────────────────────────
   FILTERS – Switch between All / Pending / Done
────────────────────────────────────────────── */
function setFilter(filter) {
  activeFilter = filter;

  // Update tab button styles
  document.querySelectorAll('.filter-tab').forEach(btn => {
    const isActive = btn.getAttribute('data-filter') === filter;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  renderTasks();
}


/* ──────────────────────────────────────────────
   SIDEBAR TOGGLE – Mobile hamburger menu
────────────────────────────────────────────── */
let sidebarOpen = false;
let overlayEl   = null;

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.add('open');
  sidebarOpen = true;

  // Create dark overlay
  overlayEl = document.createElement('div');
  overlayEl.className = 'sidebar-overlay';
  overlayEl.addEventListener('click', closeSidebar);
  document.body.appendChild(overlayEl);
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.remove('open');
  sidebarOpen = false;

  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

function toggleSidebar() {
  sidebarOpen ? closeSidebar() : openSidebar();
}


/* ──────────────────────────────────────────────
   SAMPLE TASKS – Pre-load a few tasks on first run
   so the UI doesn't start completely empty
────────────────────────────────────────────── */
function loadSampleTasks() {
  tasks = [
    {
      id:        generateId(),
      title:     'Read Chapter 4 – Thermodynamics',
      subject:   'Physics',
      priority:  'high',
      dueDate:   getTomorrowDate(),
      completed: false,
      createdAt: Date.now() - 3000
    },
    {
      id:        generateId(),
      title:     'Complete Algebra Practice Set 7',
      subject:   'Mathematics',
      priority:  'medium',
      dueDate:   '',
      completed: true,
      createdAt: Date.now() - 6000
    },
    {
      id:        generateId(),
      title:     'Write History Essay – Industrial Revolution',
      subject:   'History',
      priority:  'high',
      dueDate:   getDateInDays(3),
      completed: false,
      createdAt: Date.now() - 9000
    },
    {
      id:        generateId(),
      title:     'Revise vocabulary – French Unit 5',
      subject:   'French',
      priority:  'low',
      dueDate:   '',
      completed: false,
      createdAt: Date.now() - 12000
    }
  ];
}

// Returns ISO date string for tomorrow
function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// Returns ISO date string for N days from now
function getDateInDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}


/* ──────────────────────────────────────────────
   INIT – Wire everything up on page load
────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  // ── Set date and greeting ──
  setCurrentDate();
  setGreeting();

  // ── Load tasks from localStorage, or fall back to sample tasks ──
  const hasSaved = loadTasks();
  if (!hasSaved) {
    // First visit (or storage cleared): seed with sample tasks
    loadSampleTasks();
    saveTasks(); // Persist the sample tasks immediately
  }
  renderTasks();

  // ── Open modal – both Add Task buttons ──
  document.getElementById('addTaskBtn').addEventListener('click', openModal);
  document.getElementById('addTaskBtnTop').addEventListener('click', openModal);

  // ── Close modal – X button ──
  document.getElementById('modalClose').addEventListener('click', closeModal);

  // ── Close modal – click outside ──
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // ── Close modal – Escape key ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ── Form submit – Add a task ──
  document.getElementById('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const titleInput = document.getElementById('taskName');
    const title      = titleInput.value.trim();
    const errorEl    = document.getElementById('taskNameError');

    // Simple validation
    if (!title) {
      errorEl.textContent = 'Please enter a task name.';
      titleInput.focus();
      return;
    }

    errorEl.textContent = '';

    const subject  = document.getElementById('taskSubject').value;
    const priority = document.querySelector('input[name="priority"]:checked').value;
    const dueDate  = document.getElementById('taskDue').value;

    addTask(title, subject, priority, dueDate);
    closeModal();
  });

  // ── Filter tabs ──
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      setFilter(btn.getAttribute('data-filter'));
    });
  });

  // ── Sidebar toggle (mobile) ──
  document.getElementById('menuToggle').addEventListener('click', toggleSidebar);

  // ── Nav items (highlight effect only) ──
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      // Close sidebar on mobile after clicking
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

});
