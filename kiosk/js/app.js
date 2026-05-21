/* Kiosk App — SPA Shell + Router */
import * as shiftStart from './screens/shift-start.js';
import * as teamCheckin from './screens/team-checkin.js';
import * as stationSelector from './screens/station-selector.js';
import * as stationMenu from './screens/station-menu.js';
import * as cycleDone from './screens/cycle-done.js';
import * as evaMix from './screens/eva-mix.js';
import * as defectReport from './screens/defect-report.js';
import * as downtime from './screens/downtime.js';
import * as teamRoster from './screens/team-roster.js';
import * as roleReassign from './screens/role-reassign.js';
import { db } from './db.js';
import { api } from './api.js';

const screens = {
  'shift-start': shiftStart,
  'team-checkin': teamCheckin,
  'station-selector': stationSelector,
  'station-menu': stationMenu,
  'cycle-done': cycleDone,
  'eva-mix': evaMix,
  'defect-report': defectReport,
  'downtime': downtime,
  'team-roster': teamRoster,
  'role-reassign': roleReassign
};

let currentScreen = null;
const PROTECTED_SCREENS = ['team-checkin', 'station-selector', 'station-menu', 'cycle-done', 'eva-mix', 'defect-report', 'downtime', 'team-roster', 'role-reassign'];

class App {
  constructor() {
    this.navigate = this.navigate.bind(this);
  }

  async navigate(screenName) {
    // Prevent navigation to protected screens without active shift
    if (PROTECTED_SCREENS.includes(screenName) && !db.shiftId) {
      console.warn(`Cannot navigate to ${screenName} without active shift`);
      window.location.hash = 'shift-start';
      return;
    }

    // Hide current screen
    const currentEl = document.querySelector('.screen.active');
    if (currentEl) currentEl.classList.remove('active');

    const screen = screens[screenName];
    if (!screen) { console.error('Screen not found:', screenName); return; }

    // Check if screen element already exists
    let el = document.getElementById(`screen-${screenName}`);
    if (!el) {
      // Render screen HTML into container
      const container = document.getElementById('app');
      const wrapper = document.createElement('div');
      wrapper.innerHTML = screen.render();
      const newEl = wrapper.firstElementChild;
      newEl.id = `screen-${screenName}`;
      container.appendChild(newEl);
      el = newEl;
    }

    el.classList.add('active');
    currentScreen = screenName;

    // Initialize screen logic
    if (screen.init) {
      try {
        await screen.init();
      } catch (err) {
        console.error(`Screen ${screenName} init error:`, err);
      }
    }

    // Update URL hash for back navigation
    window.location.hash = screenName;
  }

  async init() {
    // Try sync offline queue
    if (navigator.onLine) {
      try { await api.syncOfflineQueue(); } catch {}
    }

    // Start at shift-start or station-selector if shift already active
    if (db.shiftId) {
      await this.navigate('station-selector');
    } else {
      await this.navigate('shift-start');
    }

    // Handle browser back button — prevent going back to shift-start from protected screens
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1);
      if (!hash || hash === currentScreen) return;
      
      // Allow navigation if screen exists
      if (screens[hash]) {
        this.navigate(hash);
      } else {
        // Invalid screen, go to default
        if (db.shiftId) this.navigate('station-selector');
        else this.navigate('shift-start');
      }
    });

    // Auto-sync when coming back online
    window.addEventListener('online', async () => {
      console.log('[App] Back online, syncing...');
      try {
        const result = await api.syncOfflineQueue();
        if (result.synced > 0) console.log(`[App] Synced ${result.synced} offline records`);
      } catch {}
    });

    // Idle timeout
    let idleTimer;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (currentScreen !== 'shift-start' && db.shiftId) {
          this.navigate('station-selector');
        }
      }, 300000); // 5 min idle
    };
    document.addEventListener('click', resetIdle);
    document.addEventListener('touchstart', resetIdle);
    resetIdle();
  }
}

window.App = new App();

// Boot
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
