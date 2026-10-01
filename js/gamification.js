/**
 * AttendIQ - Gamification & Audio Synthesizer
 * Streak tracking, XP rewards, dynamic levels, achievements,
 * and pure Web Audio API sound effects.
 */

const GamificationEngine = {
  // Web Audio Context for zero-latency synthesized sound effects
  audioCtx: null,

  initAudio() {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  playSound(type = 'click', enabled = true) {
    if (!enabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      if (type === 'click') {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'present') {
        // High upbeat chirp
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'absent') {
        // Lower cautionary tone
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.1);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'success' || type === 'levelup') {
        // Fanfare chord: C - E - G - C
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((f, idx) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const startTime = now + (idx * 0.06);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, startTime);
          gain.gain.setValueAtTime(0.1, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });
      }
    } catch (e) {
      // Audio might be blocked before user gesture; gracefully ignore
    }
  },

  /**
   * Determine student level and title based on XP
   */
  getLevelInfo(xp = 0) {
    const safeXP = Math.max(0, parseInt(xp, 10) || 0);
    // Level formula: 350 XP per level
    const level = Math.floor(safeXP / 350) + 1;
    const currentLevelBaseXP = (level - 1) * 350;
    const nextLevelXP = level * 350;
    const progressXP = safeXP - currentLevelBaseXP;
    const percentToNext = Math.min(100, Math.round((progressXP / 350) * 100));

    const titles = [
      'Attendance Novice',
      'Calculated Student',
      'Bunk Strategist',
      'Attendance Prodigy',
      'Classroom Commander',
      'Dean\'s List Legend'
    ];
    const title = titles[Math.min(level - 1, titles.length - 1)];

    return {
      level,
      title,
      xp: safeXP,
      progressXP,
      xpNeeded: 350 - progressXP,
      percentToNext
    };
  },

  /**
   * Update active user streak based on current date
   */
  checkAndUpdateStreak(user) {
    const today = new Date().toISOString().split('T')[0];
    if (!user.lastActiveDate) {
      user.lastActiveDate = today;
      user.streak = 1;
      return user;
    }

    if (user.lastActiveDate === today) {
      // Already active today
      return user;
    }

    const last = new Date(user.lastActiveDate);
    const curr = new Date(today);
    const diffDays = Math.round((curr - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day!
      user.streak = (user.streak || 0) + 1;
      user.xp = (user.xp || 0) + 25; // Bonus XP
    } else if (diffDays > 1) {
      // Streak broken, reset to 1
      user.streak = 1;
    }
    user.lastActiveDate = today;
    return user;
  },

  /**
   * Check if any achievements were newly unlocked
   */
  checkAchievements(state) {
    const unlocked = state.achievements || [];
    const unlockedIds = new Set(unlocked.map(a => a.id));
    const newlyUnlocked = [];
    const subjects = state.subjects || [];
    const target = state.user?.target || 75;

    const candidateBadges = [
      {
        id: 'streak_3',
        title: '3-Day Streak',
        icon: '🔥',
        desc: 'Checked in 3 days in a row',
        condition: (s) => (s.user?.streak || 0) >= 3
      },
      {
        id: 'streak_7',
        title: '7-Day Streak',
        icon: '🔥',
        desc: 'Maintained 7 consecutive attendance tracking days',
        condition: (s) => (s.user?.streak || 0) >= 7
      },
      {
        id: 'budget_master',
        title: 'Budget Master',
        icon: '🛡️',
        desc: 'Maintained a safe attendance budget of 5+ classes',
        condition: (s) => {
          const overall = AttendanceEngine.calculateOverall(subjects, target);
          return overall.safeMisses >= 5;
        }
      },
      {
        id: 'century_club',
        title: 'Perfect 100%',
        icon: '💯',
        desc: 'Have at least one subject with 100% attendance',
        condition: (s) => subjects.some(sub => sub.total > 0 && sub.attended === sub.total)
      },
      {
        id: 'danger_escaped',
        title: 'Danger Zone Escaped',
        icon: '⚡',
        desc: 'All enrolled subjects are currently in SAFE or WARNING status (none critical)',
        condition: (s) => subjects.length >= 3 && subjects.every(sub => {
          const res = AttendanceEngine.calculateSubject(sub.attended, sub.total, target);
          return res.status !== 'CRITICAL';
        })
      }
    ];

    candidateBadges.forEach(badge => {
      if (!unlockedIds.has(badge.id) && badge.condition(state)) {
        const unlockObj = {
          id: badge.id,
          title: badge.title,
          icon: badge.icon,
          desc: badge.desc,
          unlockedAt: new Date().toISOString().split('T')[0]
        };
        unlocked.push(unlockObj);
        newlyUnlocked.push(unlockObj);
      }
    });

    state.achievements = unlocked;
    return newlyUnlocked;
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GamificationEngine;
}
