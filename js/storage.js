/**
 * AttendIQ - LocalStorage & State Management Engine
 * Provides persistent data storage, demo mode seeding, backup/restore,
 * and undo/redo history tracking.
 */

const STORAGE_KEY = 'attend_iq_data_v1';

const DEMO_DATA = {
  user: {
    name: 'Alex Morgan',
    target: 75,
    streak: 7,
    lastActiveDate: new Date().toISOString().split('T')[0],
    xp: 1420,
    level: 4,
    soundEnabled: true,
    hasCompletedOnboarding: true,
    isDemoMode: true
  },
  subjects: [
    {
      id: 'sub_cs301',
      name: 'Data Structures & Algorithms',
      code: 'CS301',
      color: '#8B5CF6', // Purple
      attended: 34,
      total: 38,
      instructor: 'Dr. Sarah Jenkins',
      room: 'Turing Hall 201',
      timetable: [
        { day: 'Monday', time: '09:00 AM - 10:30 AM', room: 'Turing Hall 201' },
        { day: 'Wednesday', time: '09:00 AM - 10:30 AM', room: 'Turing Hall 201' },
        { day: 'Friday', time: '11:00 AM - 12:00 PM', room: 'Computing Lab 3' }
      ]
    },
    {
      id: 'sub_cs302',
      name: 'Operating Systems',
      code: 'CS302',
      color: '#FB7185', // Rose / Danger
      attended: 22,
      total: 31,
      instructor: 'Prof. David Vance',
      room: 'Von Neumann 104',
      timetable: [
        { day: 'Tuesday', time: '10:30 AM - 12:00 PM', room: 'Von Neumann 104' },
        { day: 'Thursday', time: '10:30 AM - 12:00 PM', room: 'Von Neumann 104' }
      ]
    },
    {
      id: 'sub_cs303',
      name: 'Database Management Systems',
      code: 'CS303',
      color: '#FBBF24', // Amber / Warning
      attended: 26,
      total: 34,
      instructor: 'Dr. Maya Lin',
      room: 'Ada Lovelace 302',
      timetable: [
        { day: 'Monday', time: '11:30 AM - 01:00 PM', room: 'Ada Lovelace 302' },
        { day: 'Friday', time: '09:30 AM - 11:00 AM', room: 'Data Lab 1' }
      ]
    },
    {
      id: 'sub_ma201',
      name: 'Discrete Mathematics',
      code: 'MA201',
      color: '#22D3EE', // Cyan
      attended: 37,
      total: 40,
      instructor: 'Prof. Robert Miller',
      room: 'Euler Hall 101',
      timetable: [
        { day: 'Wednesday', time: '02:00 PM - 03:30 PM', room: 'Euler Hall 101' },
        { day: 'Friday', time: '02:00 PM - 03:30 PM', room: 'Euler Hall 101' }
      ]
    },
    {
      id: 'sub_cs304',
      name: 'Computer Networks',
      code: 'CS304',
      color: '#F59E0B', // Warning Amber
      attended: 28,
      total: 37,
      instructor: 'Dr. Kenneth Park',
      room: 'Shannon Hall 205',
      timetable: [
        { day: 'Tuesday', time: '01:30 PM - 03:00 PM', room: 'Shannon Hall 205' },
        { day: 'Thursday', time: '01:30 PM - 03:00 PM', room: 'Network Lab 2' }
      ]
    },
    {
      id: 'sub_cs305',
      name: 'Cloud & Web Architecture',
      code: 'CS305',
      color: '#A3E635', // Lime
      attended: 29,
      total: 33,
      instructor: 'Prof. Elena Rostova',
      room: 'Berners-Lee 401',
      timetable: [
        { day: 'Monday', time: '03:30 PM - 05:00 PM', room: 'Berners-Lee 401' },
        { day: 'Wednesday', time: '03:30 PM - 05:00 PM', room: 'Berners-Lee 401' }
      ]
    }
  ],
  calendar: {}, // Populated with dynamic dates relative to current date
  achievements: [
    { id: 'streak_7', title: '7-Day Streak', icon: '🔥', desc: 'Maintained 7 consecutive attendance tracking days', unlockedAt: '2026-09-28' },
    { id: 'consistency_champ', title: 'Consistency Champion', icon: '⚡', desc: 'Logged 20+ classes without skipping an entry', unlockedAt: '2026-09-25' },
    { id: 'century_club', title: 'Calculated Strategist', icon: '🎯', desc: 'Simulated 10 attendance scenarios', unlockedAt: '2026-09-29' },
    { id: 'danger_escaped', title: 'Danger Zone Escaped', icon: '🛡️', desc: 'Recovered a critical subject back to safe', unlockedAt: '2026-09-20' }
  ],
  history: []
};

// Seed realistic calendar entries around current month
function generateDemoCalendar() {
  const cal = {};
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Generate 25 recent days of realistic logs
  for (let day = 1; day <= 28; day++) {
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Weekend

    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cal[dateKey] = {};

    // Determine status per subject based on day
    if (dayOfWeek === 1) { // Mon: CS301, CS303, CS305
      cal[dateKey]['sub_cs301'] = day === 15 ? 'absent' : 'present';
      cal[dateKey]['sub_cs303'] = 'present';
      cal[dateKey]['sub_cs305'] = 'present';
    } else if (dayOfWeek === 2) { // Tue: CS302, CS304
      cal[dateKey]['sub_cs302'] = (day === 9 || day === 23) ? 'absent' : 'present';
      cal[dateKey]['sub_cs304'] = day === 16 ? 'absent' : 'present';
    } else if (dayOfWeek === 3) { // Wed: CS301, MA201, CS305
      cal[dateKey]['sub_cs301'] = 'present';
      cal[dateKey]['sub_ma201'] = 'present';
      cal[dateKey]['sub_cs305'] = 'present';
    } else if (dayOfWeek === 4) { // Thu: CS302, CS304
      cal[dateKey]['sub_cs302'] = day === 18 ? 'absent' : 'present';
      cal[dateKey]['sub_cs304'] = 'present';
    } else if (dayOfWeek === 5) { // Fri: CS301, CS303, MA201
      cal[dateKey]['sub_cs301'] = 'present';
      cal[dateKey]['sub_cs303'] = day === 12 ? 'absent' : 'present';
      cal[dateKey]['sub_ma201'] = 'present';
    }
  }

  return cal;
}

const StorageManager = {
  /**
   * Load data from localStorage or initialize with empty template
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Ensure defaults exist
        if (!parsed.user) parsed.user = { name: 'Student', target: 75, streak: 1, xp: 100, level: 1 };
        if (!parsed.subjects) parsed.subjects = [];
        if (!parsed.calendar) parsed.calendar = {};
        if (!parsed.achievements) parsed.achievements = [];
        if (!parsed.history) parsed.history = [];
        return parsed;
      }
    } catch (e) {
      console.warn('AttendIQ: Failed to parse localStorage data, falling back to default', e);
    }
    return null;
  },

  /**
   * Save data into localStorage
   */
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // Notify components of state change
      window.dispatchEvent(new CustomEvent('attendiq:data_updated', { detail: data }));
      return true;
    } catch (e) {
      console.error('AttendIQ: Failed to save to localStorage', e);
      return false;
    }
  },

  /**
   * Seed demo data
   */
  seedDemo() {
    const demo = JSON.parse(JSON.stringify(DEMO_DATA));
    demo.calendar = generateDemoCalendar();
    this.save(demo);
    return demo;
  },

  /**
   * Create fresh blank user data
   */
  createFreshUser(name = 'Student', target = 75) {
    const fresh = {
      user: {
        name: name.trim() || 'Student',
        target: Math.max(1, Math.min(99, parseInt(target, 10) || 75)),
        streak: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        xp: 150,
        level: 1,
        soundEnabled: true,
        hasCompletedOnboarding: true,
        isDemoMode: false
      },
      subjects: [],
      calendar: {},
      achievements: [
        { id: 'first_step', title: 'First Step', icon: '🚀', desc: 'Started your AttendIQ command center journey', unlockedAt: new Date().toISOString().split('T')[0] }
      ],
      history: []
    };
    this.save(fresh);
    return fresh;
  },

  /**
   * Clear all stored data
   */
  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('attendiq:data_cleared'));
  },

  /**
   * Export database as downloadable JSON file
   */
  exportJSON() {
    const data = this.load() || DEMO_DATA;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AttendIQ_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Import data from JSON string
   */
  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.user || !Array.isArray(parsed.subjects)) {
        throw new Error('Invalid AttendIQ backup format.');
      }
      this.save(parsed);
      return { success: true, data: parsed };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

// Export for module/browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, DEMO_DATA };
}
