/**
 * AttendIQ - UI Renderer & Interaction Engine
 * Renders all views, radial gauges, visual budget tokens,
 * interactive modals, toast alerts, and reactive state updates.
 */

const UIManager = {
  activeView: 'dashboard',

  init() {
    this.bindGlobalEvents();
    this.renderActiveView();
  },

  /**
   * Determine greeting based on current local hour
   */
  getGreeting(name = 'Student') {
    const hour = new Date().getHours();
    let timeGreeting = 'Good evening';
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';
    return `${timeGreeting}, ${name} 👋`;
  },

  /**
   * Switch between views (dashboard, subjects, calendar, whatif, recovery, assistant, settings)
   */
  setView(viewName) {
    this.activeView = viewName;

    // Update navigation active states
    document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(el => {
      if (el.dataset.view === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Close mobile sidebar if open
    document.getElementById('sidebar')?.classList.remove('open');

    this.renderActiveView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Render the currently active view into #content-area
   */
  renderActiveView() {
    const container = document.getElementById('content-area');
    if (!container) return;

    const state = StorageManager.load() || StorageManager.seedDemo();

    switch (this.activeView) {
      case 'dashboard':
        container.innerHTML = this.renderDashboardHTML(state);
        this.initDashboardInteractions(state);
        break;
      case 'subjects':
        container.innerHTML = this.renderSubjectsViewHTML(state);
        this.initSubjectsInteractions(state);
        break;
      case 'calendar':
        container.innerHTML = this.renderCalendarViewHTML(state);
        this.initCalendarInteractions(state);
        break;
      case 'whatif':
        container.innerHTML = this.renderWhatIfViewHTML(state);
        this.initWhatIfInteractions(state);
        break;
      case 'recovery':
        container.innerHTML = this.renderRecoveryViewHTML(state);
        this.initRecoveryInteractions(state);
        break;
      case 'assistant':
        container.innerHTML = this.renderAssistantViewHTML(state);
        this.initAssistantInteractions(state);
        break;
      case 'settings':
        container.innerHTML = this.renderSettingsViewHTML(state);
        this.initSettingsInteractions(state);
        break;
      default:
        container.innerHTML = this.renderDashboardHTML(state);
        this.initDashboardInteractions(state);
    }

    // Refresh Lucide SVG icons if feather/lucide or inline
    this.updateHeaderProfile(state);
  },

  /**
   * Update top header profile info
   */
  updateHeaderProfile(state) {
    const userNameEl = document.getElementById('header-user-name');
    const userStreakEl = document.getElementById('header-user-streak');
    const targetBadgeEl = document.getElementById('header-target-badge');

    if (userNameEl) userNameEl.textContent = state.user?.name || 'Student';
    if (userStreakEl) userStreakEl.textContent = `${state.user?.streak || 1} Day Streak`;
    if (targetBadgeEl) targetBadgeEl.textContent = `Target: ${state.user?.target || 75}%`;

    const sideName = document.getElementById('sidebar-user-name');
    const sideRank = document.getElementById('sidebar-user-rank');
    if (sideName) sideName.textContent = state.user?.name || 'Student';
    if (sideRank) {
      const lvl = GamificationEngine.getLevelInfo(state.user?.xp || 0);
      sideRank.innerHTML = `<span>Lv. ${lvl.level}</span> • <span>${lvl.title}</span>`;
    }
  },

  /* =========================================================================
     DASHBOARD VIEW
     ========================================================================= */

  renderDashboardHTML(state) {
    const target = state.user?.target || 75;
    const overall = AttendanceEngine.calculateOverall(state.subjects, target);
    const greeting = this.getGreeting(state.user?.name);
    const tomorrowData = TimetableEngine.getScheduleForDay(state.subjects, null, target);
    const levelInfo = GamificationEngine.getLevelInfo(state.user?.xp || 0);

    // SVG Radial calculation: radius 60, circumference ~ 376.99
    const circumference = 2 * Math.PI * 60;
    const rawPct = Math.min(100, Math.max(0, overall.overallPercentage));
    const offset = circumference - (rawPct / 100) * circumference;

    // Determine status badge classes and color
    let statusClass = 'safe';
    let statusColor = 'var(--lime-safe)';
    if (overall.status === 'WARNING') {
      statusClass = 'warning';
      statusColor = 'var(--amber-warning)';
    } else if (overall.status === 'CRITICAL') {
      statusClass = 'critical';
      statusColor = 'var(--rose-danger)';
    }

    // Attendance Budget tokens generation
    const isBudgetSafe = overall.status !== 'CRITICAL';
    let tokensHTML = '';
    if (isBudgetSafe) {
      if (overall.safeMisses === 0) {
        tokensHTML = `<div class="token-empty-notice">⚠️ <strong>0 Safe Misses</strong> — Missing any class will immediately trigger Critical status!</div>`;
      } else {
        const tokenCount = Math.min(overall.safeMisses, 15); // Show up to 15 blocks
        for (let i = 1; i <= tokenCount; i++) {
          tokensHTML += `<div class="budget-token token-safe" title="Safe Absence #${i}">${i}</div>`;
        }
        if (overall.safeMisses > 15) {
          tokensHTML += `<div class="budget-token token-safe">+${overall.safeMisses - 15}</div>`;
        }
      }
    } else {
      const recCount = Math.min(overall.recoveryClasses, 15);
      for (let i = 1; i <= recCount; i++) {
        tokensHTML += `<div class="budget-token token-recovery" title="Consecutive Class to Attend #${i}">${i}</div>`;
      }
      if (overall.recoveryClasses > 15) {
        tokensHTML += `<div class="budget-token token-recovery">+${overall.recoveryClasses - 15}</div>`;
      }
    }

    // Generate Proactive Dynamic Alerts
    const alerts = this.generateAlerts(state.subjects, target);

    return `
      <!-- Welcome Banner -->
      <div class="welcome-banner">
        <div class="welcome-text">
          <h2>${greeting}</h2>
          <p>Here is your real-time college attendance command center breakdown.</p>
        </div>
        <div class="welcome-actions">
          <button class="btn btn-secondary btn-sm" id="btn-quick-log">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Quick Mark
          </button>
          <button class="btn btn-cyan btn-sm" id="btn-open-whatif">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            WHAT IF?
          </button>
          <button class="btn btn-primary btn-sm" id="btn-add-subject-top">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Subject
          </button>
        </div>
      </div>

      <!-- Command Center Top Stats Grid -->
      <div class="stats-summary-grid" style="margin-top: 24px;">
        
        <!-- Large Radial Attendance Gauge -->
        <div class="gauge-card">
          <div class="card-header-subtle">
            <span class="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Overall Attendance
            </span>
            <span class="status-badge ${statusClass}">${overall.status}</span>
          </div>

          <div class="gauge-main-wrapper">
            <div class="radial-gauge-container">
              <svg class="radial-gauge-svg" viewBox="0 0 140 140">
                <circle class="gauge-bg-circle" cx="70" cy="70" r="60"></circle>
                <circle 
                  class="gauge-progress-circle" 
                  cx="70" cy="70" r="60"
                  stroke="${statusColor}"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${offset}"
                ></circle>
              </svg>
              <div class="gauge-center-content">
                <span class="gauge-number">${overall.overallPercentageStr}%</span>
                <span class="gauge-unit">CONDUCTED</span>
              </div>
            </div>

            <div class="gauge-info">
              <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px;">
                ${overall.totalAttended} <span style="font-weight: 400; color: var(--text-secondary); font-size: 0.9rem;">of</span> ${overall.totalConducted} Classes
              </div>
              <div class="gauge-subtext">
                ${overall.summaryText}
              </div>
              <div style="margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">
                Requirement: <strong>${target}% Minimum</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Signature Attendance Budget Card -->
        <div class="budget-card ${isBudgetSafe ? 'budget-safe' : 'budget-critical'}">
          <div class="card-header-subtle">
            <span class="card-title" style="color: ${isBudgetSafe ? 'var(--cyan-electric)' : 'var(--rose-danger)'};">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              ${isBudgetSafe ? 'ATTENDANCE BUDGET' : 'RECOVERY REQUIRED'}
            </span>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Threshold: ${target}%</span>
          </div>

          <div>
            <div class="budget-hero-count">
              <span class="budget-number">${isBudgetSafe ? overall.safeMisses : overall.recoveryClasses}</span>
              <span class="budget-label">${isBudgetSafe ? 'classes to spare' : 'classes to attend'}</span>
            </div>
            <p class="budget-description">
              ${isBudgetSafe 
                ? `You can safely miss <strong>${overall.safeMisses} more class${overall.safeMisses === 1 ? '' : 'es'}</strong> before falling below ${target}%.` 
                : `Attend the next <strong>${overall.recoveryClasses} consecutive classes</strong> across your courses to reach ${target}%.`}
            </p>
          </div>

          <!-- Visual Blocks / Tokens -->
          <div>
            <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">
              ${isBudgetSafe ? 'Available Bunk Tokens' : 'Recovery Milestone Tokens'}
            </div>
            <div class="budget-tokens-wrapper">
              ${tokensHTML}
            </div>
          </div>
        </div>

        <!-- Gamification & Level Card -->
        <div class="gamification-card">
          <div class="card-header-subtle">
            <span class="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Student Standing
            </span>
            <span style="font-size: 0.8rem; font-weight: 700; color: #FB923C;">🔥 ${state.user?.streak || 1}d Streak</span>
          </div>

          <div>
            <div class="level-badge-large">
              <span>Lv. ${levelInfo.level}</span>
              <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-secondary);">${levelInfo.title}</span>
            </div>
            
            <div class="xp-bar-container">
              <div class="xp-bar-fill" style="width: ${levelInfo.percentToNext}%;"></div>
            </div>
            
            <div class="xp-progress-subtext">
              <span>${levelInfo.progressXP} / 350 XP</span>
              <span>${levelInfo.xpNeeded} XP to Lv. ${levelInfo.level + 1}</span>
            </div>
          </div>

          <div>
            <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">
              Achievements Unlocked (${state.achievements?.length || 0})
            </div>
            <div class="mini-badges-row">
              ${(state.achievements || []).slice(0, 5).map(a => `
                <div class="mini-badge-item" title="${a.title}: ${a.desc}">${a.icon}</div>
              `).join('')}
              ${(state.achievements?.length || 0) > 5 ? `<div class="mini-badge-item" title="More achievements">+${state.achievements.length - 5}</div>` : ''}
            </div>
          </div>
        </div>

      </div>

      <!-- Proactive Attendance Alerts Banner -->
      ${alerts.length > 0 ? `
        <div style="margin-top: 24px;">
          <div class="alerts-container">
            ${alerts.map(a => `
              <div class="alert-item alert-${a.type}">
                <div class="alert-content">
                  <span class="alert-icon">${a.icon}</span>
                  <div>
                    <strong>${a.title}:</strong> ${a.message}
                  </div>
                </div>
                ${a.action ? `<button class="alert-btn" data-action="${a.action}" data-subject-id="${a.subjectId || ''}">${a.actionLabel}</button>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Tomorrow Planner Section -->
      <div style="margin-top: 28px;">
        <div class="tomorrow-card">
          <div class="card-header-subtle" style="margin-bottom: 12px;">
            <div>
              <span class="card-title" style="color: var(--purple-light);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Tomorrow Planner
              </span>
              <div style="font-size: 1.1rem; font-weight: 700; margin-top: 2px;">
                ${tomorrowData.day} • ${tomorrowData.count} Class${tomorrowData.count === 1 ? '' : 'es'} Scheduled
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-view-calendar">Full Calendar ➔</button>
          </div>

          ${tomorrowData.count === 0 ? `
            <div style="text-align: center; padding: 24px; color: var(--text-muted);">
              🎉 No classes scheduled for tomorrow! Enjoy your free time or study ahead.
            </div>
          ` : `
            <div class="tomorrow-schedule-grid">
              ${tomorrowData.classes.map(c => `
                <div class="tomorrow-class-item">
                  <div class="class-header-row">
                    <span class="class-time-tag">${c.time}</span>
                    <span class="status-badge ${c.impact.current.status.toLowerCase()}">${c.impact.current.status}</span>
                  </div>
                  <div class="class-name" style="color: ${c.subjectColor}">${c.subjectName}</div>
                  <div class="class-location">📍 ${c.room} • ${c.instructor}</div>

                  <div class="impact-comparison-box">
                    <div class="impact-row">
                      <span>Current Attendance:</span>
                      <strong>${c.impact.current.percentageStr}% (${c.currentAttended}/${c.currentTotal})</strong>
                    </div>
                    <div class="impact-row" style="color: var(--lime-safe);">
                      <span>If you attend:</span>
                      <strong>${c.impact.ifAttend.stats.percentageStr}% (${c.impact.ifAttend.deltaStr})</strong>
                    </div>
                    <div class="impact-row" style="color: var(--rose-danger);">
                      <span>If you miss:</span>
                      <strong>${c.impact.ifMiss.stats.percentageStr}% (${c.impact.ifMiss.deltaStr})</strong>
                    </div>
                    <div class="impact-advice">
                      💡 ${c.impact.recommendation}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- Subject Cards Grid Section -->
      <div style="margin-top: 32px;">
        <div class="section-toolbar">
          <div>
            <h2 class="section-title-large">Subject-Wise Breakdown</h2>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              Manage your subjects and click +Present / +Absent to log in 1-click
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-subject-grid">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Subject
          </button>
        </div>

        <div class="subject-grid">
          ${state.subjects.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: var(--card-bg); border-radius: var(--radius-xl); border: 1px dashed var(--border-subtle);">
              <div style="font-size: 2.5rem; margin-bottom: 12px;">📚</div>
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 6px;">No Subjects Added Yet</h3>
              <p style="color: var(--text-secondary); max-width: 420px; margin: 0 auto 20px;">
                Start by adding your enrolled subjects or load the demo dataset to explore the command center instantly.
              </p>
              <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="btn btn-primary" id="btn-empty-add-subject">+ Add First Subject</button>
                <button class="btn btn-cyan" id="btn-empty-load-demo">Try Demo Mode</button>
              </div>
            </div>
          ` : state.subjects.map(sub => {
            const stats = AttendanceEngine.calculateSubject(sub.attended, sub.total, target);
            let badgeClass = 'safe';
            let barColor = 'var(--lime-safe)';
            if (stats.status === 'WARNING') {
              badgeClass = 'warning';
              barColor = 'var(--amber-warning)';
            } else if (stats.status === 'CRITICAL') {
              badgeClass = 'critical';
              barColor = 'var(--rose-danger)';
            }

            return `
              <div class="subject-card" data-subject-id="${sub.id}">
                <div class="subject-card-top">
                  <div>
                    <span class="subject-code-pill">${sub.code || 'COURSE'}</span>
                    <h3 class="subject-title">${sub.name}</h3>
                    <div class="subject-instructor">${sub.instructor || 'Faculty'} • ${sub.room || 'Campus'}</div>
                  </div>
                  <div style="display: flex; gap: 4px;">
                    <button class="btn-icon btn-edit-subject" data-id="${sub.id}" title="Edit Subject">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-delete-subject" data-id="${sub.id}" title="Delete Subject" style="color: var(--rose-danger);">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>

                <div class="subject-metrics-row">
                  <div class="subject-pct-big" style="color: ${barColor};">${stats.percentageStr}%</div>
                  <div class="subject-count-text">${stats.attended} / ${stats.total} classes</div>
                </div>

                <!-- Progress Bar with Target Line -->
                <div class="progress-bar-container">
                  <div class="progress-bar-fill" style="width: ${Math.min(100, stats.percentage)}%; background-color: ${barColor};"></div>
                  <div class="progress-target-marker" style="left: ${target}%;" title="Target Requirement: ${target}%"></div>
                </div>

                <!-- Guidance & Budget / Recovery Pill -->
                <div class="subject-guidance-pill ${badgeClass}">
                  ${stats.status === 'CRITICAL' ? `
                    <span>🔴 Need <strong>${stats.recoveryClasses} consecutive class${stats.recoveryClasses === 1 ? '' : 'es'}</strong> to recover</span>
                  ` : stats.safeMisses === 0 ? `
                    <span>⚠️ <strong>0 safe misses</strong> left before critical!</span>
                  ` : `
                    <span>🟢 Safe to miss <strong>${stats.safeMisses} more class${stats.safeMisses === 1 ? '' : 'es'}</strong></span>
                  `}
                </div>

                <!-- Quick Action Buttons -->
                <div class="subject-actions-row">
                  <button class="btn btn-quick-present" data-id="${sub.id}" title="Attended 1 class (+1 Attended, +1 Total)">
                    + Present
                  </button>
                  <button class="btn btn-quick-absent" data-id="${sub.id}" title="Missed 1 class (+1 Total, +0 Attended)">
                    + Absent
                  </button>
                  <button class="btn btn-secondary btn-sm btn-simulate-sub" data-id="${sub.id}" title="Simulate future classes for this subject">
                    Simulate
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Generate intelligent contextual alerts based on current data
   */
  generateAlerts(subjects = [], target = 75) {
    const alerts = [];

    subjects.forEach(sub => {
      const stats = AttendanceEngine.calculateSubject(sub.attended, sub.total, target);
      if (stats.status === 'CRITICAL') {
        alerts.push({
          type: 'critical',
          icon: '🚨',
          title: `CRITICAL: ${sub.name}`,
          message: `Currently at ${stats.percentageStr}%. You must attend the next ${stats.recoveryClasses} consecutive classes to recover above ${target}%.`,
          action: 'view_recovery',
          actionLabel: 'View Recovery Plan',
          subjectId: sub.id
        });
      } else if (stats.safeMisses === 0) {
        alerts.push({
          type: 'warning',
          icon: '⚠️',
          title: `DANGER ZONE: ${sub.name}`,
          message: `Attendance is ${stats.percentageStr}%. You have 0 safe absences left — missing the next class drops you directly into Critical!`,
          action: 'simulate_subject',
          actionLabel: 'Simulate',
          subjectId: sub.id
        });
      } else if (stats.safeMisses <= 2) {
        alerts.push({
          type: 'warning',
          icon: '⚡',
          title: `Low Budget: ${sub.name}`,
          message: `You have only ${stats.safeMisses} safe absence${stats.safeMisses === 1 ? '' : 's'} remaining before dropping below ${target}%.`,
          action: 'simulate_subject',
          actionLabel: 'Simulate',
          subjectId: sub.id
        });
      }
    });

    // If no warnings or critical, give a positive affirmation
    if (alerts.length === 0 && subjects.length > 0) {
      alerts.push({
        type: 'info',
        icon: '🛡️',
        title: 'All Clear',
        message: `All enrolled subjects are comfortably above your ${target}% target threshold. Keep up the great consistency!`,
        action: null,
        actionLabel: null
      });
    }

    return alerts;
  },

  /**
   * Bind Dashboard events
   */
  initDashboardInteractions(state) {
    // Top action buttons
    document.getElementById('btn-open-whatif')?.addEventListener('click', () => {
      this.setView('whatif');
    });

    document.getElementById('btn-view-calendar')?.addEventListener('click', () => {
      this.setView('calendar');
    });

    const addBtns = ['btn-add-subject-top', 'btn-add-subject-grid', 'btn-empty-add-subject'];
    addBtns.forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        this.openSubjectModal();
      });
    });

    document.getElementById('btn-empty-load-demo')?.addEventListener('click', () => {
      StorageManager.seedDemo();
      this.showToast('Realistic demo data loaded successfully! 🎉', 'success');
      this.renderActiveView();
    });

    // Quick mark button
    document.getElementById('btn-quick-log')?.addEventListener('click', () => {
      this.openQuickMarkModal(state);
    });

    // Subject Card Quick Actions: Present & Absent
    document.querySelectorAll('.btn-quick-present').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const subId = btn.dataset.id;
        this.logAttendanceQuick(subId, true);
      });
    });

    document.querySelectorAll('.btn-quick-absent').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const subId = btn.dataset.id;
        this.logAttendanceQuick(subId, false);
      });
    });

    // Simulate button on subject card
    document.querySelectorAll('.btn-simulate-sub').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const subId = btn.dataset.id;
        this.setView('whatif');
        setTimeout(() => {
          const select = document.getElementById('sim-subject-select');
          if (select) {
            select.value = subId;
            select.dispatchEvent(new Event('change'));
          }
        }, 50);
      });
    });

    // Edit and Delete subject buttons
    document.querySelectorAll('.btn-edit-subject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const subId = btn.dataset.id;
        const sub = state.subjects.find(s => s.id === subId);
        if (sub) this.openSubjectModal(sub);
      });
    });

    document.querySelectorAll('.btn-delete-subject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const subId = btn.dataset.id;
        this.confirmDeleteSubject(subId);
      });
    });

    // Alert action buttons
    document.querySelectorAll('.alert-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const subId = btn.dataset.subjectId;
        if (action === 'view_recovery') {
          this.setView('recovery');
        } else if (action === 'simulate_subject') {
          this.setView('whatif');
          setTimeout(() => {
            const select = document.getElementById('sim-subject-select');
            if (select && subId) {
              select.value = subId;
              select.dispatchEvent(new Event('change'));
            }
          }, 50);
        }
      });
    });
  },

  /**
   * Log 1 class quickly (Present or Absent)
   */
  logAttendanceQuick(subjectId, isPresent) {
    const state = StorageManager.load() || StorageManager.seedDemo();
    const sub = state.subjects.find(s => s.id === subjectId);
    if (!sub) return;

    if (isPresent) {
      sub.attended = (sub.attended || 0) + 1;
      sub.total = (sub.total || 0) + 1;
      state.user.xp = (state.user.xp || 0) + 20; // XP Reward
      GamificationEngine.playSound('present', state.user.soundEnabled);
      this.showToast(`Marked Present for ${sub.name} (+20 XP)`, 'success');
    } else {
      sub.total = (sub.total || 0) + 1;
      GamificationEngine.playSound('absent', state.user.soundEnabled);
      this.showToast(`Marked Absent for ${sub.name}`, 'warning');
    }

    // Record into today's calendar log
    const todayKey = CalendarEngine.formatDateKey(new Date());
    if (!state.calendar) state.calendar = {};
    if (!state.calendar[todayKey]) state.calendar[todayKey] = {};
    state.calendar[todayKey][subjectId] = isPresent ? 'present' : 'absent';

    // Check newly unlocked achievements
    const newlyUnlocked = GamificationEngine.checkAchievements(state);
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(b => {
        this.showToast(`🏆 Achievement Unlocked: ${b.title}!`, 'success');
      });
      GamificationEngine.playSound('levelup', state.user.soundEnabled);
    }

    StorageManager.save(state);
    this.renderActiveView();
  },

  /* =========================================================================
     WHAT-IF SIMULATOR VIEW
     ========================================================================= */

  renderWhatIfViewHTML(state) {
    const target = state.user?.target || 75;
    const overall = AttendanceEngine.calculateOverall(state.subjects, target);

    return `
      <div class="simulator-box">
        <div style="text-align: center; margin-bottom: 24px;">
          <div class="hero-pill" style="margin-bottom: 12px;">
            <span class="hero-pill-dot"></span>
            Predictive Attendance Engine
          </div>
          <h2 style="font-size: 1.8rem; font-weight: 800;">"What If?" Attendance Simulator</h2>
          <p style="color: var(--text-secondary); max-width: 540px; margin: 0 auto; font-size: 0.92rem;">
            Test future attendance scenarios before deciding to skip or attend. See instant projected consequences.
          </p>
        </div>

        <!-- Subject Selector & Target indicator -->
        <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
          <div class="form-group" style="flex: 2; min-width: 240px;">
            <label class="form-label">Select Subject to Simulate</label>
            <select class="form-input" id="sim-subject-select">
              <option value="overall">All Subjects (Overall Attendance: ${overall.overallPercentageStr}%)</option>
              ${state.subjects.map(s => {
                const res = AttendanceEngine.calculateSubject(s.attended, s.total, target);
                return `<option value="${s.id}">${s.name} (${s.code || 'COURSE'}) — Current: ${res.percentageStr}% [${res.status}]</option>`;
              }).join('')}
            </select>
          </div>

          <div class="form-group" style="flex: 1; min-width: 140px;">
            <label class="form-label">Target Threshold</label>
            <div class="form-input" style="background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: 700; color: var(--purple-light);">${target}%</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Configured</span>
            </div>
          </div>
        </div>

        <!-- Before & After Comparison Stage -->
        <div class="sim-comparison-stage">
          <!-- Current Metric -->
          <div class="sim-metric-block">
            <div class="sim-metric-label">Current Attendance</div>
            <div class="sim-metric-value" id="sim-current-pct" style="color: #FFFFFF;">
              ${overall.overallPercentageStr}%
            </div>
            <div id="sim-current-status-wrapper" style="margin-top: 8px;">
              <span class="status-badge ${overall.status.toLowerCase()}">${overall.status}</span>
            </div>
            <div id="sim-current-subtext" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">
              ${overall.totalAttended} / ${overall.totalConducted} classes
            </div>
          </div>

          <!-- Animated Arrow & Delta Divider -->
          <div class="sim-arrow-divider">
            <span class="sim-arrow-icon">➔</span>
            <span class="sim-delta-chip" id="sim-delta-badge">+0.0%</span>
          </div>

          <!-- Projected Metric -->
          <div class="sim-metric-block">
            <div class="sim-metric-label">Projected Attendance</div>
            <div class="sim-metric-value" id="sim-projected-pct" style="color: var(--cyan-electric);">
              ${overall.overallPercentageStr}%
            </div>
            <div id="sim-projected-status-wrapper" style="margin-top: 8px;">
              <span class="status-badge ${overall.status.toLowerCase()}">${overall.status}</span>
            </div>
            <div id="sim-projected-subtext" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">
              ${overall.totalAttended} / ${overall.totalConducted} classes
            </div>
          </div>
        </div>

        <!-- Narrative Impact Box -->
        <div class="sim-narrative-box" id="sim-narrative-box">
          ${overall.summaryText}
        </div>

        <!-- Controls: Miss Classes & Attend Classes Sliders -->
        <div class="sim-controls-wrapper" style="margin-top: 28px;">
          
          <!-- Miss Classes Row -->
          <div class="sim-slider-row">
            <div class="sim-slider-label-row">
              <span style="color: var(--rose-danger); display: flex; align-items: center; gap: 6px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                What if I MISS future classes?
              </span>
              <div class="sim-stepper">
                <button class="stepper-btn" id="btn-miss-dec">-</button>
                <span id="label-miss-count" style="font-weight: 800; min-width: 24px; text-align: center;">0</span>
                <button class="stepper-btn" id="btn-miss-inc">+</button>
              </div>
            </div>
            <input type="range" id="slider-miss-count" min="0" max="25" value="0" style="accent-color: var(--rose-danger);" />
          </div>

          <!-- Attend Classes Row -->
          <div class="sim-slider-row" style="margin-top: 14px;">
            <div class="sim-slider-label-row">
              <span style="color: var(--lime-safe); display: flex; align-items: center; gap: 6px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>
                What if I ATTEND future classes?
              </span>
              <div class="sim-stepper">
                <button class="stepper-btn" id="btn-attend-dec">-</button>
                <span id="label-attend-count" style="font-weight: 800; min-width: 24px; text-align: center;">0</span>
                <button class="stepper-btn" id="btn-attend-inc">+</button>
              </div>
            </div>
            <input type="range" id="slider-attend-count" min="0" max="25" value="0" style="accent-color: var(--lime-safe);" />
          </div>

          <!-- Quick Scenario Presets -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px;">
            <span style="font-size: 0.8rem; color: var(--text-muted); align-self: center; margin-right: 4px;">Quick Presets:</span>
            <button class="btn btn-secondary btn-sm" id="preset-miss-1">Miss 1 Class</button>
            <button class="btn btn-secondary btn-sm" id="preset-miss-3">Miss 3 Classes</button>
            <button class="btn btn-secondary btn-sm" id="preset-attend-5">Attend 5 Classes</button>
            <button class="btn btn-secondary btn-sm" id="preset-attend-10">Attend 10 Classes</button>
            <button class="btn btn-secondary btn-sm" id="preset-reset" style="margin-left: auto;">Reset Sliders</button>
          </div>

        </div>
      </div>
    `;
  },

  initWhatIfInteractions(state) {
    const target = state.user?.target || 75;

    const select = document.getElementById('sim-subject-select');
    const sliderMiss = document.getElementById('slider-miss-count');
    const sliderAttend = document.getElementById('slider-attend-count');
    const labelMiss = document.getElementById('label-miss-count');
    const labelAttend = document.getElementById('label-attend-count');

    const curPctEl = document.getElementById('sim-current-pct');
    const curStatusEl = document.getElementById('sim-current-status-wrapper');
    const curSubtextEl = document.getElementById('sim-current-subtext');

    const projPctEl = document.getElementById('sim-projected-pct');
    const projStatusEl = document.getElementById('sim-projected-status-wrapper');
    const projSubtextEl = document.getElementById('sim-projected-subtext');
    const deltaBadgeEl = document.getElementById('sim-delta-badge');
    const narrativeEl = document.getElementById('sim-narrative-box');

    const getBaseMetrics = () => {
      const val = select.value;
      if (val === 'overall') {
        const overall = AttendanceEngine.calculateOverall(state.subjects, target);
        return {
          attended: overall.totalAttended,
          total: overall.totalConducted,
          name: 'Overall Attendance'
        };
      } else {
        const sub = state.subjects.find(s => s.id === val);
        return {
          attended: sub ? sub.attended : 0,
          total: sub ? sub.total : 0,
          name: sub ? sub.name : 'Subject'
        };
      }
    };

    const runSimulation = () => {
      const base = getBaseMetrics();
      const missCount = parseInt(sliderMiss.value, 10) || 0;
      const attendCount = parseInt(sliderAttend.value, 10) || 0;

      labelMiss.textContent = missCount;
      labelAttend.textContent = attendCount;

      const simResult = AttendanceEngine.simulate(
        { attended: base.attended, total: base.total },
        { missCount, attendCount },
        target
      );

      // Update Current Column
      curPctEl.textContent = `${simResult.current.percentageStr}%`;
      curStatusEl.innerHTML = `<span class="status-badge ${simResult.current.status.toLowerCase()}">${simResult.current.status}</span>`;
      curSubtextEl.textContent = `${simResult.current.attended} / ${simResult.current.total} classes`;

      // Update Projected Column
      projPctEl.textContent = `${simResult.projected.percentageStr}%`;
      let projColor = 'var(--lime-safe)';
      if (simResult.projected.status === 'WARNING') projColor = 'var(--amber-warning)';
      if (simResult.projected.status === 'CRITICAL') projColor = 'var(--rose-danger)';
      projPctEl.style.color = projColor;

      projStatusEl.innerHTML = `<span class="status-badge ${simResult.projected.status.toLowerCase()}">${simResult.projected.status}</span>`;
      projSubtextEl.textContent = `${simResult.projected.attended} / ${simResult.projected.total} classes`;

      // Delta Badge
      const delta = simResult.deltaPct;
      deltaBadgeEl.textContent = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
      deltaBadgeEl.className = `sim-delta-chip ${delta >= 0 ? 'positive' : 'negative'}`;

      // Narrative
      narrativeEl.innerHTML = simResult.narrative;
    };

    select?.addEventListener('change', runSimulation);
    sliderMiss?.addEventListener('input', runSimulation);
    sliderAttend?.addEventListener('input', runSimulation);

    // Stepper buttons
    document.getElementById('btn-miss-inc')?.addEventListener('click', () => {
      sliderMiss.value = Math.min(25, parseInt(sliderMiss.value, 10) + 1);
      runSimulation();
    });
    document.getElementById('btn-miss-dec')?.addEventListener('click', () => {
      sliderMiss.value = Math.max(0, parseInt(sliderMiss.value, 10) - 1);
      runSimulation();
    });
    document.getElementById('btn-attend-inc')?.addEventListener('click', () => {
      sliderAttend.value = Math.min(25, parseInt(sliderAttend.value, 10) + 1);
      runSimulation();
    });
    document.getElementById('btn-attend-dec')?.addEventListener('click', () => {
      sliderAttend.value = Math.max(0, parseInt(sliderAttend.value, 10) - 1);
      runSimulation();
    });

    // Presets
    document.getElementById('preset-miss-1')?.addEventListener('click', () => {
      sliderMiss.value = 1;
      sliderAttend.value = 0;
      runSimulation();
    });
    document.getElementById('preset-miss-3')?.addEventListener('click', () => {
      sliderMiss.value = 3;
      sliderAttend.value = 0;
      runSimulation();
    });
    document.getElementById('preset-attend-5')?.addEventListener('click', () => {
      sliderMiss.value = 0;
      sliderAttend.value = 5;
      runSimulation();
    });
    document.getElementById('preset-attend-10')?.addEventListener('click', () => {
      sliderMiss.value = 0;
      sliderAttend.value = 10;
      runSimulation();
    });
    document.getElementById('preset-reset')?.addEventListener('click', () => {
      sliderMiss.value = 0;
      sliderAttend.value = 0;
      runSimulation();
    });

    // Initial run
    runSimulation();
  },

  /* =========================================================================
     SMART RECOVERY PLANS VIEW
     ========================================================================= */

  renderRecoveryViewHTML(state) {
    const target = state.user?.target || 75;
    const criticalSubjects = state.subjects.filter(sub => {
      const stats = AttendanceEngine.calculateSubject(sub.attended, sub.total, target);
      return stats.status === 'CRITICAL';
    });

    return `
      <div style="max-width: 900px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div class="hero-pill" style="margin-bottom: 12px;">
            <span class="hero-pill-dot" style="background: var(--rose-danger); box-shadow: 0 0 10px var(--rose-danger);"></span>
            Deficit Clearance Engine
          </div>
          <h2 style="font-size: 1.8rem; font-weight: 800;">Smart Recovery Plans</h2>
          <p style="color: var(--text-secondary); max-width: 580px; margin: 0 auto; font-size: 0.92rem;">
            When a subject is below your ${target}% requirement, AttendIQ generates a step-by-step consecutive attendance roadmap to bring you safely back.
          </p>
        </div>

        ${criticalSubjects.length === 0 ? `
          <div style="text-align: center; padding: 48px; background: var(--card-bg); border-radius: var(--radius-xl); border: 1px solid var(--border-subtle);">
            <div style="font-size: 3rem; margin-bottom: 16px;">🏆</div>
            <h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; color: var(--lime-safe);">Zero Recovery Plans Needed!</h3>
            <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 20px;">
              Outstanding job! None of your enrolled subjects are currently in CRITICAL status. All are comfortably meeting or exceeding your ${target}% requirement.
            </p>
            <button class="btn btn-primary" id="btn-back-to-dash">Return to Dashboard</button>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 28px;">
            ${criticalSubjects.map(sub => {
              const stats = AttendanceEngine.calculateSubject(sub.attended, sub.total, target);
              const roadmap = AttendanceEngine.generateRecoveryRoadmap(sub.attended, sub.total, target);

              return `
                <div class="subject-card" style="padding: 28px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                    <div>
                      <span class="subject-code-pill">${sub.code || 'COURSE'}</span>
                      <h3 style="font-size: 1.35rem; font-weight: 800; margin-top: 4px;">${sub.name}</h3>
                      <div style="color: var(--text-muted); font-size: 0.85rem;">Instructor: ${sub.instructor || 'Faculty'}</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 2rem; font-weight: 800; color: var(--rose-danger);">${stats.percentageStr}%</div>
                      <div style="font-size: 0.82rem; color: var(--text-secondary);">${stats.attended} / ${stats.total} Classes Attended</div>
                    </div>
                  </div>

                  <!-- Recovery Requirement Callout -->
                  <div style="padding: 16px; background: rgba(251, 113, 133, 0.1); border: 1px solid rgba(251, 113, 133, 0.3); border-radius: var(--radius-lg); margin-bottom: 20px;">
                    <div style="font-weight: 700; color: #FFE4E6; font-size: 1.05rem;">
                      🎯 Recovery Goal: Attend the next <strong>${stats.recoveryClasses} consecutive classes</strong>
                    </div>
                    <p style="font-size: 0.85rem; color: #FECDD3; margin-top: 4px;">
                      Currently ${Math.abs(stats.deltaToTarget).toFixed(1)}% below your ${target}% threshold. Following this sequential journey will lift your standing back to Safe.
                    </p>
                  </div>

                  <!-- Visual Step-by-Step Journey Roadmap -->
                  <div>
                    <h4 style="font-size: 0.85rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 12px;">
                      Recovery Progression Journey
                    </h4>
                    <div class="recovery-journey-wrapper">
                      ${roadmap.map(step => `
                        <div class="recovery-step-item ${step.isGoal ? 'is-goal' : ''}">
                          <div class="recovery-step-num">${step.isGoal ? '🏆' : step.step}</div>
                          <div class="recovery-step-info">
                            <div class="recovery-step-title">${step.isGoal ? 'Safe Zone Reached! 🎉' : `Attend Class #${step.step}`}</div>
                            <div style="font-size: 0.78rem; color: var(--text-secondary);">
                              ${step.isGoal ? `Crosses requirement: ${step.projectedPctStr}% (≥ ${target}%)` : `${step.classesRemaining} more class${step.classesRemaining === 1 ? '' : 'es'} needed after this`}
                            </div>
                          </div>
                          <div class="recovery-step-pct" style="color: ${step.isGoal ? 'var(--lime-safe)' : 'var(--cyan-electric)'};">
                            ${step.projectedPctStr}%
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  initRecoveryInteractions(state) {
    document.getElementById('btn-back-to-dash')?.addEventListener('click', () => {
      this.setView('dashboard');
    });
  },

  /* =========================================================================
     ATTENDANCE CALENDAR VIEW
     ========================================================================= */

  renderCalendarViewHTML(state) {
    const monthData = CalendarEngine.getMonthData();
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return `
      <div class="calendar-view-card">
        <div class="calendar-header-nav">
          <div>
            <h2 class="calendar-month-title">${monthData.title}</h2>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              Click any date to view schedule and log Present, Absent, or No Class
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" id="cal-btn-prev">‹ Prev</button>
            <button class="btn btn-secondary btn-sm" id="cal-btn-today">Today</button>
            <button class="btn btn-secondary btn-sm" id="cal-btn-next">Next ›</button>
          </div>
        </div>

        <!-- Legend -->
        <div style="display: flex; gap: 16px; margin-bottom: 16px; font-size: 0.8rem; color: var(--text-secondary); flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="cal-dot dot-present"></span> Present
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="cal-dot dot-absent"></span> Absent
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="cal-dot dot-cancelled"></span> Cancelled / Holiday
          </div>
          <div style="margin-left: auto; font-size: 0.75rem; color: var(--text-muted);">
            Today highlighted in purple
          </div>
        </div>

        <!-- Calendar Days Grid -->
        <div class="calendar-grid">
          ${dayLabels.map(l => `<div class="calendar-day-label">${l}</div>`).join('')}
          ${monthData.days.map(d => {
            const summary = CalendarEngine.getDateSummary(d.dateKey, state.calendar, state.subjects);
            const hasPresent = summary.presentCount > 0;
            const hasAbsent = summary.absentCount > 0;
            const hasCancelled = summary.cancelledCount > 0;

            return `
              <div 
                class="calendar-cell ${d.isCurrentMonth ? '' : 'other-month'} ${d.isToday ? 'is-today' : ''}" 
                data-date-key="${d.dateKey}"
              >
                <div class="cal-day-num">${d.dayNumber}</div>
                <div class="cal-dots-row">
                  ${hasPresent ? `<span class="cal-dot dot-present" title="${summary.presentCount} attended"></span>` : ''}
                  ${hasAbsent ? `<span class="cal-dot dot-absent" title="${summary.absentCount} missed"></span>` : ''}
                  ${hasCancelled ? `<span class="cal-dot dot-cancelled" title="${summary.cancelledCount} cancelled"></span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Day Detail Container inserted below calendar when a date is clicked -->
      <div id="day-detail-container" style="margin-top: 24px;"></div>
    `;
  },

  initCalendarInteractions(state) {
    document.getElementById('cal-btn-prev')?.addEventListener('click', () => {
      CalendarEngine.prevMonth();
      this.renderActiveView();
    });

    document.getElementById('cal-btn-next')?.addEventListener('click', () => {
      CalendarEngine.nextMonth();
      this.renderActiveView();
    });

    document.getElementById('cal-btn-today')?.addEventListener('click', () => {
      CalendarEngine.resetToToday();
      this.renderActiveView();
    });

    // Calendar cell click
    document.querySelectorAll('.calendar-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateKey = cell.dataset.dateKey;
        this.openDayDetail(dateKey, state);
      });
    });
  },

  /**
   * Render Day Detail inspector beneath the calendar
   */
  openDayDetail(dateKey, state) {
    const container = document.getElementById('day-detail-container');
    if (!container) return;

    const summary = CalendarEngine.getDateSummary(dateKey, state.calendar, state.subjects);

    container.innerHTML = `
      <div class="subject-card" style="padding: 24px; animation: slideInDown 0.25s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800;">Schedule for ${summary.formattedDate}</h3>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              ${summary.presentCount} Present • ${summary.absentCount} Absent • ${summary.cancelledCount} Cancelled
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-close-day-detail">Close</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${summary.subjectEntries.map(entry => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); flex-wrap: wrap; gap: 10px;">
              <div>
                <span class="subject-code-pill">${entry.subjectCode || 'COURSE'}</span>
                <strong style="margin-left: 8px;">${entry.subjectName}</strong>
                ${entry.isScheduled ? `<span style="font-size: 0.72rem; color: var(--cyan-electric); margin-left: 6px;">[Timetable Scheduled]</span>` : ''}
              </div>

              <div style="display: flex; gap: 8px;">
                <button 
                  class="btn btn-sm btn-day-log ${entry.status === 'present' ? 'btn-primary' : 'btn-secondary'}" 
                  data-date-key="${dateKey}" 
                  data-subject-id="${entry.subjectId}" 
                  data-status="present"
                >
                  ✓ Present
                </button>
                <button 
                  class="btn btn-sm btn-day-log ${entry.status === 'absent' ? 'btn-danger' : 'btn-secondary'}" 
                  data-date-key="${dateKey}" 
                  data-subject-id="${entry.subjectId}" 
                  data-status="absent"
                >
                  ✗ Absent
                </button>
                <button 
                  class="btn btn-sm btn-day-log ${entry.status === 'cancelled' ? 'btn-cyan' : 'btn-secondary'}" 
                  data-date-key="${dateKey}" 
                  data-subject-id="${entry.subjectId}" 
                  data-status="cancelled"
                >
                  No Class
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-close-day-detail')?.addEventListener('click', () => {
      container.innerHTML = '';
    });

    container.querySelectorAll('.btn-day-log').forEach(btn => {
      btn.addEventListener('click', () => {
        const dKey = btn.dataset.dateKey;
        const subId = btn.dataset.subjectId;
        const status = btn.dataset.status;
        this.saveDayAttendance(dKey, subId, status);
      });
    });

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  /**
   * Save status for a specific date and subject
   */
  saveDayAttendance(dateKey, subjectId, newStatus) {
    const state = StorageManager.load() || StorageManager.seedDemo();
    if (!state.calendar) state.calendar = {};
    if (!state.calendar[dateKey]) state.calendar[dateKey] = {};

    const oldStatus = state.calendar[dateKey][subjectId];
    const sub = state.subjects.find(s => s.id === subjectId);

    // Adjust subject counts if changing between present and absent
    if (sub) {
      if (oldStatus === 'present') {
        sub.attended = Math.max(0, (sub.attended || 1) - 1);
        sub.total = Math.max(0, (sub.total || 1) - 1);
      } else if (oldStatus === 'absent') {
        sub.total = Math.max(0, (sub.total || 1) - 1);
      }

      if (newStatus === 'present') {
        sub.attended = (sub.attended || 0) + 1;
        sub.total = (sub.total || 0) + 1;
      } else if (newStatus === 'absent') {
        sub.total = (sub.total || 0) + 1;
      }
    }

    state.calendar[dateKey][subjectId] = newStatus;
    StorageManager.save(state);
    this.showToast(`Updated ${sub?.name || 'class'} for ${dateKey}`, 'success');
    this.renderActiveView();
  },

  /* =========================================================================
     ATTENDIQ ASSISTANT VIEW
     ========================================================================= */

  renderAssistantViewHTML(state) {
    return `
      <div class="assistant-panel">
        <div class="assistant-header">
          <div class="assistant-title-group">
            <div class="assistant-avatar">⚡</div>
            <div>
              <div style="font-weight: 700; font-size: 1.05rem;">AttendIQ Assistant</div>
              <div style="font-size: 0.75rem; color: var(--cyan-electric); display: flex; align-items: center; gap: 4px;">
                <span class="hero-pill-dot" style="width: 6px; height: 6px;"></span> Active Data Copilot
              </div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-clear-chat">Clear History</button>
        </div>

        <div class="assistant-messages" id="assistant-chat-log">
          <div class="chat-bubble assistant">
            Hello ${state.user?.name || 'Alex'}! I'm your AttendIQ command center copilot. I analyze your live attendance records to answer questions about bunk allowances, tomorrow's risk, and recovery requirements.
            <br/><br/>
            Pick a quick prompt below or type your question!
          </div>
        </div>

        <!-- Suggested query chips -->
        <div class="suggested-chips-bar">
          ${AssistantEngine.suggestedQuestions.map(q => `
            <button class="suggested-chip" data-query="${q}">${q}</button>
          `).join('')}
        </div>

        <div class="assistant-input-area">
          <input 
            type="text" 
            class="assistant-input" 
            id="assistant-query-input" 
            placeholder="Ask about tomorrow's classes, safe bunk limits, or recovery..."
          />
          <button class="btn btn-primary" id="btn-assistant-send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Ask
          </button>
        </div>
      </div>
    `;
  },

  initAssistantInteractions(state) {
    const input = document.getElementById('assistant-query-input');
    const sendBtn = document.getElementById('btn-assistant-send');
    const chatLog = document.getElementById('assistant-chat-log');

    const handleAsk = (queryText) => {
      const q = (queryText || input.value || '').trim();
      if (!q) return;

      // Append user bubble
      const userBubble = document.createElement('div');
      userBubble.className = 'chat-bubble user';
      userBubble.textContent = q;
      chatLog.appendChild(userBubble);

      if (input) input.value = '';
      chatLog.scrollTop = chatLog.scrollHeight;

      // Synthesize answer using live state
      setTimeout(() => {
        const liveState = StorageManager.load() || state;
        const answer = AssistantEngine.ask(q, liveState);

        const botBubble = document.createElement('div');
        botBubble.className = 'chat-bubble assistant';
        botBubble.innerHTML = answer.reply.replace(/\n/g, '<br/>');
        chatLog.appendChild(botBubble);
        chatLog.scrollTop = chatLog.scrollHeight;

        GamificationEngine.playSound('click', liveState.user?.soundEnabled);
      }, 300);
    };

    sendBtn?.addEventListener('click', () => handleAsk());
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAsk();
    });

    document.querySelectorAll('.suggested-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        handleAsk(chip.dataset.query);
      });
    });

    document.getElementById('btn-clear-chat')?.addEventListener('click', () => {
      chatLog.innerHTML = `
        <div class="chat-bubble assistant">
          Chat cleared. Ask me any question regarding your attendance records!
        </div>
      `;
    });
  },

  /* =========================================================================
     SUBJECTS MANAGEMENT VIEW
     ========================================================================= */

  renderSubjectsViewHTML(state) {
    const target = state.user?.target || 75;

    return `
      <div>
        <div class="section-toolbar">
          <div>
            <h2 class="section-title-large">Manage Enrolled Subjects</h2>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              Configure courses, total classes, timetable schedules, and faculty
            </div>
          </div>
          <button class="btn btn-primary" id="btn-add-subject-view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Subject
          </button>
        </div>

        <div class="subject-grid">
          ${state.subjects.map(sub => {
            const stats = AttendanceEngine.calculateSubject(sub.attended, sub.total, target);
            let barColor = 'var(--lime-safe)';
            if (stats.status === 'WARNING') barColor = 'var(--amber-warning)';
            if (stats.status === 'CRITICAL') barColor = 'var(--rose-danger)';

            return `
              <div class="subject-card" data-subject-id="${sub.id}">
                <div class="subject-card-top">
                  <div>
                    <span class="subject-code-pill">${sub.code || 'COURSE'}</span>
                    <h3 class="subject-title">${sub.name}</h3>
                    <div class="subject-instructor">${sub.instructor || 'Faculty'} • ${sub.room || 'Campus'}</div>
                  </div>
                  <div style="display: flex; gap: 4px;">
                    <button class="btn-icon btn-edit-subject" data-id="${sub.id}" title="Edit Subject">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-delete-subject" data-id="${sub.id}" title="Delete Subject" style="color: var(--rose-danger);">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>

                <div class="subject-metrics-row">
                  <div class="subject-pct-big" style="color: ${barColor};">${stats.percentageStr}%</div>
                  <div class="subject-count-text">${stats.attended} / ${stats.total} classes</div>
                </div>

                <div class="progress-bar-container">
                  <div class="progress-bar-fill" style="width: ${Math.min(100, stats.percentage)}%; background-color: ${barColor};"></div>
                  <div class="progress-target-marker" style="left: ${target}%;"></div>
                </div>

                <!-- Timetable slots preview -->
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">Weekly Slots</div>
                  <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    ${(sub.timetable || []).map(t => `
                      <span style="font-size: 0.72rem; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); padding: 2px 8px; border-radius: var(--radius-sm); font-family: var(--font-mono);">
                        ${t.day.slice(0,3)} ${t.time.split('-')[0].trim()}
                      </span>
                    `).join('')}
                    ${(!sub.timetable || sub.timetable.length === 0) ? `<span style="font-size: 0.75rem; color: var(--text-muted);">No slots added</span>` : ''}
                  </div>
                </div>

                <div class="subject-actions-row">
                  <button class="btn btn-quick-present" data-id="${sub.id}">+ Present</button>
                  <button class="btn btn-quick-absent" data-id="${sub.id}">+ Absent</button>
                  <button class="btn btn-secondary btn-sm btn-edit-subject" data-id="${sub.id}">Edit</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  initSubjectsInteractions(state) {
    document.getElementById('btn-add-subject-view')?.addEventListener('click', () => {
      this.openSubjectModal();
    });

    document.querySelectorAll('.btn-edit-subject').forEach(btn => {
      btn.addEventListener('click', () => {
        const sub = state.subjects.find(s => s.id === btn.dataset.id);
        if (sub) this.openSubjectModal(sub);
      });
    });

    document.querySelectorAll('.btn-delete-subject').forEach(btn => {
      btn.addEventListener('click', () => {
        this.confirmDeleteSubject(btn.dataset.id);
      });
    });

    document.querySelectorAll('.btn-quick-present').forEach(btn => {
      btn.addEventListener('click', () => this.logAttendanceQuick(btn.dataset.id, true));
    });

    document.querySelectorAll('.btn-quick-absent').forEach(btn => {
      btn.addEventListener('click', () => this.logAttendanceQuick(btn.dataset.id, false));
    });
  },

  /* =========================================================================
     SETTINGS VIEW
     ========================================================================= */

  renderSettingsViewHTML(state) {
    return `
      <div style="max-width: 680px; margin: 0 auto;">
        <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 24px;">Command Center Settings</h2>

        <div class="subject-card" style="padding: 28px; display: flex; flex-direction: column; gap: 24px;">
          <!-- Profile Settings -->
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px;">Student Profile</h3>
            <div class="form-group">
              <label class="form-label">Student Name</label>
              <input type="text" class="form-input" id="setting-user-name" value="${state.user?.name || 'Student'}" />
            </div>
          </div>

          <!-- Minimum Attendance Requirement Threshold -->
          <div style="padding-top: 16px; border-top: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h3 style="font-size: 1.1rem; font-weight: 700;">Minimum Attendance Requirement</h3>
              <span id="label-setting-target" style="font-size: 1.3rem; font-weight: 800; color: var(--purple-light);">
                ${state.user?.target || 75}%
              </span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 14px;">
              Threshold used for all Safe/Warning/Critical status calculations, attendance budget, and recovery plans.
            </p>
            <input type="range" id="slider-setting-target" min="50" max="95" value="${state.user?.target || 75}" />
          </div>

          <!-- Sound Effects -->
          <div style="padding-top: 16px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; font-size: 1rem;">Synthesized Audio Feedback</div>
              <div style="font-size: 0.82rem; color: var(--text-secondary);">Play subtle audio feedback when logging classes and unlocking achievements</div>
            </div>
            <input type="checkbox" id="setting-sound-enabled" ${state.user?.soundEnabled !== false ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--purple-primary); cursor: pointer;" />
          </div>

          <!-- Save Button -->
          <button class="btn btn-primary" id="btn-save-settings">Save Preferences</button>

          <!-- Data Management & Demo Actions -->
          <div style="padding-top: 24px; border-top: 1px solid var(--border-subtle);">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 14px;">Backup & Reset Options</h3>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" id="btn-export-backup">Export Backup (JSON)</button>
              <button class="btn btn-cyan btn-sm" id="btn-seed-demo-settings">Reset to Realistic Demo Data</button>
              <button class="btn btn-danger btn-sm" id="btn-clear-all-data">Clear All Records</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  initSettingsInteractions(state) {
    const slider = document.getElementById('slider-setting-target');
    const label = document.getElementById('label-setting-target');
    const nameInput = document.getElementById('setting-user-name');
    const soundCheck = document.getElementById('setting-sound-enabled');

    slider?.addEventListener('input', () => {
      label.textContent = `${slider.value}%`;
    });

    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      const liveState = StorageManager.load() || state;
      liveState.user.name = (nameInput.value || 'Student').trim();
      liveState.user.target = parseInt(slider.value, 10) || 75;
      liveState.user.soundEnabled = soundCheck.checked;

      StorageManager.save(liveState);
      this.showToast('Settings saved successfully!', 'success');
      this.updateHeaderProfile(liveState);
    });

    document.getElementById('btn-export-backup')?.addEventListener('click', () => {
      StorageManager.exportJSON();
      this.showToast('Attendance backup downloaded!', 'success');
    });

    document.getElementById('btn-seed-demo-settings')?.addEventListener('click', () => {
      StorageManager.seedDemo();
      this.showToast('Realistic college dataset restored!', 'success');
      this.renderActiveView();
    });

    document.getElementById('btn-clear-all-data')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all attendance data? This action cannot be undone.')) {
        StorageManager.createFreshUser();
        this.showToast('All records cleared.', 'warning');
        this.renderActiveView();
      }
    });
  },

  /* =========================================================================
     MODAL HANDLERS (Add/Edit Subject, Quick Mark)
     ========================================================================= */

  /**
   * Modal to Add or Edit Subject
   */
  openSubjectModal(subjectToEdit = null) {
    const modal = document.getElementById('global-modal');
    if (!modal) return;

    const isEdit = !!subjectToEdit;
    const sub = subjectToEdit || {
      name: '',
      code: '',
      attended: 0,
      total: 0,
      instructor: '',
      room: '',
      color: '#8B5CF6',
      timetable: []
    };

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit Subject' : 'Add New Subject'}</h3>
          <button class="btn-icon" id="btn-close-modal">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Subject Name *</label>
            <input type="text" class="form-input" id="modal-sub-name" placeholder="e.g. Operating Systems" value="${sub.name}" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Subject Code</label>
              <input type="text" class="form-input" id="modal-sub-code" placeholder="e.g. CS302" value="${sub.code || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Card Accent Color</label>
              <select class="form-input" id="modal-sub-color">
                <option value="#8B5CF6" ${sub.color === '#8B5CF6' ? 'selected' : ''}>Purple (Primary)</option>
                <option value="#22D3EE" ${sub.color === '#22D3EE' ? 'selected' : ''}>Cyan (Electric)</option>
                <option value="#A3E635" ${sub.color === '#A3E635' ? 'selected' : ''}>Lime (Green)</option>
                <option value="#FBBF24" ${sub.color === '#FBBF24' ? 'selected' : ''}>Amber (Warning)</option>
                <option value="#FB7185" ${sub.color === '#FB7185' ? 'selected' : ''}>Rose (Danger)</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Classes Attended *</label>
              <input type="number" class="form-input" id="modal-sub-attended" min="0" value="${sub.attended}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Total Conducted *</label>
              <input type="number" class="form-input" id="modal-sub-total" min="0" value="${sub.total}" required />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Instructor (Optional)</label>
              <input type="text" class="form-input" id="modal-sub-instructor" placeholder="e.g. Dr. Vance" value="${sub.instructor || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Classroom / Lab (Optional)</label>
              <input type="text" class="form-input" id="modal-sub-room" placeholder="e.g. Hall 201" value="${sub.room || ''}" />
            </div>
          </div>

          <!-- Timetable Slot helper -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px;">
            <label class="form-label">Weekly Timetable Schedule (For Tomorrow Planner)</label>
            <div style="display: flex; gap: 8px; margin-top: 6px;">
              <select class="form-input" id="modal-tt-day" style="flex: 1;">
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
              </select>
              <input type="text" class="form-input" id="modal-tt-time" placeholder="e.g. 10:30 AM - 12:00 PM" style="flex: 2;" />
              <button type="button" class="btn btn-secondary btn-sm" id="btn-add-tt-slot">+ Slot</button>
            </div>
            <div id="modal-tt-list" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
              ${(sub.timetable || []).map((t, idx) => `
                <span class="subject-code-pill" style="display: inline-flex; align-items: center; gap: 4px;" data-idx="${idx}">
                  ${t.day} (${t.time}) <span style="cursor: pointer; color: var(--rose-danger);" onclick="this.parentElement.remove()">✕</span>
                </span>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-modal">Cancel</button>
          <button class="btn btn-primary" id="btn-save-subject-modal">${isEdit ? 'Save Changes' : 'Create Subject'}</button>
        </div>
      </div>
    `;

    modal.classList.add('open');

    // Slot adder
    const ttDay = document.getElementById('modal-tt-day');
    const ttTime = document.getElementById('modal-tt-time');
    const ttList = document.getElementById('modal-tt-list');

    document.getElementById('btn-add-tt-slot')?.addEventListener('click', () => {
      const timeVal = (ttTime.value || '10:00 AM - 11:00 AM').trim();
      const chip = document.createElement('span');
      chip.className = 'subject-code-pill';
      chip.style.display = 'inline-flex';
      chip.style.alignItems = 'center';
      chip.style.gap = '4px';
      chip.innerHTML = `${ttDay.value} (${timeVal}) <span style="cursor: pointer; color: var(--rose-danger);">✕</span>`;
      chip.querySelector('span').addEventListener('click', () => chip.remove());
      chip.dataset.day = ttDay.value;
      chip.dataset.time = timeVal;
      ttList.appendChild(chip);
      ttTime.value = '';
    });

    const closeModal = () => modal.classList.remove('open');
    document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

    // Save subject
    document.getElementById('btn-save-subject-modal')?.addEventListener('click', () => {
      const name = document.getElementById('modal-sub-name').value.trim();
      const code = document.getElementById('modal-sub-code').value.trim();
      const color = document.getElementById('modal-sub-color').value;
      const attended = parseInt(document.getElementById('modal-sub-attended').value, 10) || 0;
      let total = parseInt(document.getElementById('modal-sub-total').value, 10) || 0;
      const instructor = document.getElementById('modal-sub-instructor').value.trim();
      const room = document.getElementById('modal-sub-room').value.trim();

      if (!name) {
        alert('Please enter a subject name.');
        return;
      }

      if (attended > total) total = attended;

      // Extract timetable slots
      const timetableSlots = [];
      ttList.querySelectorAll('.subject-code-pill').forEach(pill => {
        if (pill.dataset.day && pill.dataset.time) {
          timetableSlots.push({ day: pill.dataset.day, time: pill.dataset.time, room: room || 'Main Hall' });
        } else {
          // Parse text content e.g. "Monday (10:30 AM)"
          const text = pill.textContent.replace('✕', '').trim();
          const match = text.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday)\s*\((.+)\)/i);
          if (match) {
            timetableSlots.push({ day: match[1], time: match[2], room: room || 'Main Hall' });
          }
        }
      });

      const state = StorageManager.load() || StorageManager.seedDemo();

      if (isEdit) {
        const existing = state.subjects.find(s => s.id === subjectToEdit.id);
        if (existing) {
          existing.name = name;
          existing.code = code;
          existing.color = color;
          existing.attended = attended;
          existing.total = total;
          existing.instructor = instructor;
          existing.room = room;
          if (timetableSlots.length > 0) existing.timetable = timetableSlots;
        }
        this.showToast(`Updated ${name}`, 'success');
      } else {
        const newSub = {
          id: 'sub_' + Date.now(),
          name,
          code: code || name.slice(0, 5).toUpperCase(),
          color,
          attended,
          total,
          instructor,
          room,
          timetable: timetableSlots.length > 0 ? timetableSlots : [
            { day: 'Monday', time: '10:00 AM - 11:30 AM', room: room || 'Hall 101' }
          ]
        };
        state.subjects.push(newSub);
        state.user.xp = (state.user.xp || 0) + 50; // XP reward for adding subject
        this.showToast(`Added ${name} (+50 XP)`, 'success');
      }

      StorageManager.save(state);
      closeModal();
      this.renderActiveView();
    });
  },

  /**
   * Confirm and delete subject
   */
  confirmDeleteSubject(subjectId) {
    const state = StorageManager.load() || StorageManager.seedDemo();
    const sub = state.subjects.find(s => s.id === subjectId);
    if (!sub) return;

    if (confirm(`Are you sure you want to delete ${sub.name} (${sub.code})?`)) {
      state.subjects = state.subjects.filter(s => s.id !== subjectId);
      StorageManager.save(state);
      this.showToast(`Deleted ${sub.name}`, 'warning');
      this.renderActiveView();
    }
  },

  /**
   * Modal for Quick Attendance Check-in
   */
  openQuickMarkModal(state) {
    const modal = document.getElementById('global-modal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Quick Mark Today's Classes</h3>
          <button class="btn-icon" id="btn-close-modal">✕</button>
        </div>

        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">
            Quickly check in or report absences for all your courses today:
          </p>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${state.subjects.map(s => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
                <div>
                  <strong>${s.name}</strong>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">${s.code || 'COURSE'} • ${s.attended}/${s.total}</div>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-sm btn-quick-present" data-id="${s.id}">+ Present</button>
                  <button class="btn btn-sm btn-quick-absent" data-id="${s.id}">+ Absent</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-modal">Done</button>
        </div>
      </div>
    `;

    modal.classList.add('open');

    const closeModal = () => modal.classList.remove('open');
    document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

    modal.querySelectorAll('.btn-quick-present').forEach(btn => {
      btn.addEventListener('click', () => {
        this.logAttendanceQuick(btn.dataset.id, true);
        closeModal();
      });
    });

    modal.querySelectorAll('.btn-quick-absent').forEach(btn => {
      btn.addEventListener('click', () => {
        this.logAttendanceQuick(btn.dataset.id, false);
        closeModal();
      });
    });
  },

  /**
   * Toast notification display
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'warning') icon = '⚠️';
    if (type === 'danger') icon = '🚨';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  },

  /**
   * Bind global sidebar, navigation, and theme events
   */
  bindGlobalEvents() {
    // Navigation clicks
    document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        if (view) this.setView(view);
      });
    });

    // Mobile menu toggle
    document.getElementById('mobile-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });

    // Header target badge quick change
    document.getElementById('header-target-badge')?.addEventListener('click', () => {
      this.setView('settings');
    });
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIManager;
}
