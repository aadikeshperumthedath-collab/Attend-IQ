/**
 * AttendIQ - Main Application Controller
 * Handles application lifecycle, landing page vs command center routing,
 * onboarding flow, and global state sync.
 */

const App = {
  currentRoute: 'landing', // 'landing' | 'app'

  init() {
    const savedData = StorageManager.load();

    // Check URL params or local state to decide whether to show Landing or Dashboard
    const urlParams = new URLSearchParams(window.location.search);
    const forceApp = urlParams.get('app');
    const forceDemo = urlParams.get('demo');
    const targetView = urlParams.get('view') || 'dashboard';

    if (forceDemo === 'true') {
      StorageManager.seedDemo();
      this.enterApp(targetView);
    } else if (urlParams.has('view')) {
      if (!savedData) StorageManager.seedDemo();
      this.enterApp(targetView);
    } else if (forceApp === 'true' || (savedData && savedData.user?.hasCompletedOnboarding)) {
      this.enterApp(targetView);
    } else {
      this.showLandingPage();
    }

    this.bindLandingEvents();
  },

  /**
   * Display the startup landing page
   */
  showLandingPage() {
    this.currentRoute = 'landing';
    const landingEl = document.getElementById('landing-view');
    const appEl = document.getElementById('app-layout');

    if (landingEl) landingEl.style.display = 'flex';
    if (appEl) appEl.style.display = 'none';

    // Populate the live preview card in the landing hero with demo metrics
    this.renderLandingPreview();
  },

  /**
   * Enter the active AttendIQ Command Center
   */
  enterApp(initialView = 'dashboard') {
    this.currentRoute = 'app';
    const landingEl = document.getElementById('landing-view');
    const appEl = document.getElementById('app-layout');

    if (landingEl) landingEl.style.display = 'none';
    if (appEl) appEl.style.display = 'flex';

    // Ensure state exists
    let state = StorageManager.load();
    if (!state) {
      state = StorageManager.seedDemo();
    }

    // Update streak check-in
    state.user = GamificationEngine.checkAndUpdateStreak(state.user);
    StorageManager.save(state);

    // Initialize UI Manager
    UIManager.init();
    if (initialView) {
      UIManager.setView(initialView);
    }
  },

  /**
   * Renders the interactive preview card on the landing page
   */
  renderLandingPreview() {
    const previewContainer = document.getElementById('landing-preview-content');
    if (!previewContainer) return;

    // Use DEMO_DATA to render a realistic mini dashboard preview
    const overall = AttendanceEngine.calculateOverall(DEMO_DATA.subjects, DEMO_DATA.user.target);

    previewContainer.innerHTML = `
      <div style="padding: 24px; background: #080B18; border-radius: 0 0 20px 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 0.8rem; color: var(--cyan-electric); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Live Preview</div>
            <h4 style="font-size: 1.25rem; font-weight: 800;">Good evening, Alex 👋</h4>
          </div>
          <div style="display: flex; gap: 8px;">
            <span class="streak-chip">🔥 7 Day Streak</span>
            <span class="status-badge safe">SAFE 81.4%</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          <!-- Mini Radial Stat -->
          <div style="background: #11172A; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 20px;">
            <div style="width: 76px; height: 76px; border-radius: 50%; border: 6px solid var(--lime-safe); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 800;">
              81%
            </div>
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Overall Attendance</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #FFF; margin: 2px 0;">176 / 216 Classes</div>
              <div style="font-size: 0.75rem; color: var(--lime-safe);">✓ Above 75% target threshold</div>
            </div>
          </div>

          <!-- Mini Budget -->
          <div style="background: #11172A; border: 1px solid rgba(34,211,238,0.25); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--cyan-electric);">Attendance Budget</div>
              <div style="font-size: 1.8rem; font-weight: 800; color: #FFF; margin-top: 4px;">5 Classes</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">Safe to miss before dropping below 75%</div>
            </div>
            <div style="display: flex; gap: 4px; margin-top: 10px;">
              <span class="budget-token token-safe" style="width:24px; height:24px; font-size:0.7rem;">1</span>
              <span class="budget-token token-safe" style="width:24px; height:24px; font-size:0.7rem;">2</span>
              <span class="budget-token token-safe" style="width:24px; height:24px; font-size:0.7rem;">3</span>
              <span class="budget-token token-safe" style="width:24px; height:24px; font-size:0.7rem;">4</span>
              <span class="budget-token token-safe" style="width:24px; height:24px; font-size:0.7rem;">5</span>
            </div>
          </div>

          <!-- Mini Tomorrow Planner -->
          <div style="background: #11172A; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px;">
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--purple-light);">Tomorrow Planner</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
              <strong style="font-size: 0.9rem;">Operating Systems (CS302)</strong>
              <span class="status-badge critical" style="font-size: 0.65rem;">CRITICAL</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--rose-danger); margin-top: 6px;">
              🚨 High Impact: Missing drops attendance to 68.8%!
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Bind events on landing page
   */
  bindLandingEvents() {
    // Try Demo buttons
    const demoBtns = ['btn-landing-demo', 'btn-landing-demo-cta', 'sidebar-btn-demo'];
    demoBtns.forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        StorageManager.seedDemo();
        App.enterApp('dashboard');
        UIManager.showToast('Realistic demo semester loaded! 🎉', 'success');
      });
    });

    // Start Tracking buttons
    const startBtns = ['btn-landing-start', 'btn-landing-start-cta'];
    startBtns.forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        const existing = StorageManager.load();
        if (!existing || existing.subjects.length === 0) {
          App.openOnboardingModal();
        } else {
          App.enterApp('dashboard');
        }
      });
    });

    // Landing nav links
    document.getElementById('btn-landing-to-dash')?.addEventListener('click', (e) => {
      e.preventDefault();
      App.enterApp('dashboard');
    });

    // Back to Landing page from sidebar
    document.getElementById('btn-back-to-landing')?.addEventListener('click', () => {
      App.showLandingPage();
    });
  },

  /**
   * Onboarding modal for fresh users
   */
  openOnboardingModal() {
    const modal = document.getElementById('global-modal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px; text-align: center; padding: 32px 24px;">
        <div class="brand-icon-wrapper" style="margin: 0 auto 16px; width: 48px; height: 48px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>

        <h3 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 6px;">Welcome to AttendIQ</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 24px;">
          Set up your profile to start tracking attendance flexibility and recovery plans.
        </p>

        <div style="text-align: left; display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
          <div class="form-group">
            <label class="form-label">Your Name</label>
            <input type="text" class="form-input" id="onboarding-name" placeholder="e.g. Alex Morgan" value="" />
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label class="form-label">Minimum Attendance Requirement</label>
              <strong id="onboarding-target-label" style="color: var(--purple-light);">75%</strong>
            </div>
            <input type="range" id="onboarding-target-slider" min="50" max="95" value="75" />
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn btn-primary" id="btn-onboarding-continue">
            Start My Command Center ➔
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-onboarding-demo">
            Or Load Sample College Data
          </button>
        </div>
      </div>
    `;

    modal.classList.add('open');

    const slider = document.getElementById('onboarding-target-slider');
    const label = document.getElementById('onboarding-target-label');
    slider?.addEventListener('input', () => {
      label.textContent = `${slider.value}%`;
    });

    document.getElementById('btn-onboarding-continue')?.addEventListener('click', () => {
      const name = (document.getElementById('onboarding-name').value || 'Student').trim();
      const target = parseInt(slider.value, 10) || 75;

      StorageManager.createFreshUser(name, target);
      modal.classList.remove('open');
      App.enterApp('dashboard');
      UIManager.showToast(`Welcome, ${name}! Add your first subject to get started.`, 'success');
    });

    document.getElementById('btn-onboarding-demo')?.addEventListener('click', () => {
      StorageManager.seedDemo();
      modal.classList.remove('open');
      App.enterApp('dashboard');
      UIManager.showToast('Realistic demo semester loaded!', 'success');
    });
  }
};

// Auto start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
