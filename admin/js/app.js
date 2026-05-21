/* Admin App Shell + Router */
import { api } from './api.js';

const pages = {};
const pageModules = [
  'overview', 'stations', 'eva-consumption', 'cycle-efficiency', 'defects',
  'downtime', 'breaks', 'teams', 'eva-inventory', 'molds', 'eva-materials',
  'recipes', 'station-config', 'workers', 'settings'
];

// Load page modules dynamically
async function loadPage(name) {
  if (!pages[name]) {
    const mod = await import(`./pages/${name}.js`);
    pages[name] = mod;
  }
  return pages[name];
}

const navConfig = [
  { section: 'Production', items: [
    { id: 'overview', label: 'Production Overview', icon: '📊' },
    { id: 'stations', label: 'Station Detail', icon: '🏭' },
    { id: 'eva-consumption', label: 'EVA Consumption', icon: '🧪' },
    { id: 'cycle-efficiency', label: 'Cycle Efficiency', icon: '⚡' },
    { id: 'defects', label: 'Defect Analysis', icon: '⚠️' },
    { id: 'downtime', label: 'Downtime Analysis', icon: '🔴' },
    { id: 'breaks', label: 'Break Analysis', icon: '☕' },
  ]},
  { section: 'People', items: [
    { id: 'teams', label: 'Teams', icon: '👥' },
  ]},
  { section: 'Materials', items: [
    { id: 'eva-inventory', label: 'EVA Inventory', icon: '📦' },
    { id: 'molds', label: 'Molds', icon: '🔩' },
    { id: 'eva-materials', label: 'EVA Materials', icon: '🎨' },
    { id: 'recipes', label: 'Recipes', icon: '📋' },
  ]},
  { section: 'Configuration', items: [
    { id: 'station-config', label: 'Station Config', icon: '⚙️' },
    { id: 'workers', label: 'Workers', icon: '👷' },
    { id: 'settings', label: 'Settings', icon: '🔧' },
  ]}
];

class AdminApp {
  constructor() {
    this.currentPage = null;
    this.sidebarOpen = false;
  }

  async init() {
    // Check auth
    const token = localStorage.getItem('eva_admin_token');
    if (!token) {
      this.showLogin();
      return;
    }

    try {
      await api.get('/health');
    } catch {
      this.showLogin();
      return;
    }

    this.setupLayout();
    this.setupEventListeners();
    this.navigate('overview');
  }

  showLogin() {
    window.location.href = '/admin/login.html';
  }

  setupLayout() {
    // Populate sidebar navigation
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';
    
    for (const section of navConfig) {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'nav-section';
      sectionEl.textContent = section.section;
      nav.appendChild(sectionEl);

      for (const item of section.items) {
        const itemEl = document.createElement('a');
        itemEl.className = 'nav-item';
        itemEl.href = '#';
        itemEl.dataset.page = item.id;
        itemEl.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
        itemEl.addEventListener('click', (e) => {
          e.preventDefault();
          this.navigate(item.id);
          this.closeSidebar();
        });
        nav.appendChild(itemEl);
      }
    }
  }

  setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => this.toggleSidebar());
    }

    if (sidebarToggleBtn) {
      sidebarToggleBtn.addEventListener('click', () => this.closeSidebar());
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        if (sidebar && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
          this.closeSidebar();
        }
      }
    });

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('eva_admin_token');
        this.showLogin();
      });
    }

    // Window resize handler for responsive
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.closeSidebar();
      }
    });
  }

  toggleSidebar() {
    this.sidebarOpen ? this.closeSidebar() : this.openSidebar();
  }

  openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.add('open');
      this.sidebarOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.remove('open');
      this.sidebarOpen = false;
      document.body.style.overflow = '';
    }
  }

  async navigate(pageId) {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navItem = document.querySelector(`[data-page="${pageId}"]`);
    if (navItem) navItem.classList.add('active');

    // Update breadcrumbs
    const currentNav = navConfig
      .flatMap(s => s.items)
      .find(item => item.id === pageId);
    
    const breadcrumbs = document.getElementById('breadcrumbs');
    if (breadcrumbs && currentNav) {
      breadcrumbs.innerHTML = `
        <div class="breadcrumb-item"><a href="#" onclick="window.AdminApp.navigate('overview'); return false;">Dashboard</a></div>
        <div class="breadcrumb-item">/</div>
        <div class="breadcrumb-item active">${currentNav.label}</div>
      `;
    }

    this.currentPage = pageId;

    try {
      const page = await loadPage(pageId);
      const pageContent = document.getElementById('page-content');
      if (page.render) pageContent.innerHTML = page.render();
      if (page.init) await page.init();
    } catch (err) {
      document.getElementById('page-content').innerHTML = `
        <div class="card">
          <div class="card-header">
            <h2>Error</h2>
          </div>
          <p>Error loading page: ${err.message}</p>
        </div>
      `;
      console.error(`Page ${pageId} error:`, err);
    }
  }
}

window.AdminApp = new AdminApp();
document.addEventListener('DOMContentLoaded', () => window.AdminApp.init());
