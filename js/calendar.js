/**
 * AttendIQ - Calendar Engine
 * Interactive monthly calendar, attendance heatmaps,
 * and date-specific class logging.
 */

const CalendarEngine = {
  currentViewDate: new Date(),

  /**
   * Set month navigation
   */
  prevMonth() {
    this.currentViewDate.setMonth(this.currentViewDate.getMonth() - 1);
    return this.getMonthData();
  },

  nextMonth() {
    this.currentViewDate.setMonth(this.currentViewDate.getMonth() + 1);
    return this.getMonthData();
  },

  resetToToday() {
    this.currentViewDate = new Date();
    return this.getMonthData();
  },

  /**
   * Generates calendar days matrix for the currently viewed month
   */
  getMonthData() {
    const year = this.currentViewDate.getFullYear();
    const month = this.currentViewDate.getMonth(); // 0-indexed

    const monthName = this.currentViewDate.toLocaleString('default', { month: 'long' });
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDate = today.getDate();

    const days = [];

    // Days from previous month for grid padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const pDay = prevMonthTotalDays - i;
      const prevDateObj = new Date(year, month - 1, pDay);
      const dateKey = this.formatDateKey(prevDateObj);
      days.push({
        dayNumber: pDay,
        dateKey,
        isCurrentMonth: false,
        isToday: false,
        dateObj: prevDateObj
      });
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const dateKey = this.formatDateKey(dateObj);
      days.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: true,
        isToday: isCurrentMonth && d === todayDate,
        dateObj
      });
    }

    // Days from next month to complete standard 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextDateObj = new Date(year, month + 1, n);
      const dateKey = this.formatDateKey(nextDateObj);
      days.push({
        dayNumber: n,
        dateKey,
        isCurrentMonth: false,
        isToday: false,
        dateObj: nextDateObj
      });
    }

    return {
      year,
      month,
      monthName,
      title: `${monthName} ${year}`,
      days
    };
  },

  /**
   * Helper to format date object into YYYY-MM-DD
   */
  formatDateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Inspect logged attendance for a specific dateKey
   * @param {string} dateKey - 'YYYY-MM-DD'
   * @param {Object} calendarState - data.calendar
   * @param {Array} subjects - data.subjects
   */
  getDateSummary(dateKey, calendarState = {}, subjects = []) {
    const dayLogs = calendarState[dateKey] || {};
    const d = new Date(dateKey + 'T00:00:00');
    const dayName = TimetableEngine.DAYS_OF_WEEK[d.getDay()];

    let presentCount = 0;
    let absentCount = 0;
    let cancelledCount = 0;

    const subjectEntries = subjects.map(sub => {
      // Find if this subject is scheduled on this day
      const isScheduled = Array.isArray(sub.timetable) && sub.timetable.some(slot => slot.day.toLowerCase() === dayName.toLowerCase());
      const status = dayLogs[sub.id] || null; // 'present' | 'absent' | 'cancelled' | null

      if (status === 'present') presentCount++;
      if (status === 'absent') absentCount++;
      if (status === 'cancelled') cancelledCount++;

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        subjectColor: sub.color,
        isScheduled,
        status
      };
    });

    return {
      dateKey,
      dayName,
      formattedDate: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
      presentCount,
      absentCount,
      cancelledCount,
      totalMarked: presentCount + absentCount + cancelledCount,
      subjectEntries
    };
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarEngine;
}
