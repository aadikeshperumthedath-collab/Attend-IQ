/**
 * AttendIQ - Timetable & Tomorrow Planner Engine
 * Analyzes upcoming schedule, maps subjects to days,
 * and performs precision what-if risk evaluations for each class.
 */

const TimetableEngine = {
  DAYS_OF_WEEK: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

  /**
   * Get tomorrow's day name and date formatted
   */
  getTomorrowInfo() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dayName = this.DAYS_OF_WEEK[tomorrow.getDay()];
    const dateFormatted = tomorrow.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });

    return {
      dateObj: tomorrow,
      dayName,
      dateFormatted,
      isWeekend: tomorrow.getDay() === 0 || tomorrow.getDay() === 6
    };
  },

  /**
   * Get schedule for a specific day name (e.g. 'Monday', 'Tuesday', or 'Tomorrow')
   * @param {Array} subjects
   * @param {string} targetDay - e.g. 'Tuesday' or null for tomorrow
   * @param {number} targetThreshold
   */
  getScheduleForDay(subjects = [], targetDay = null, targetThreshold = 75) {
    let day = targetDay;
    if (!day) {
      day = this.getTomorrowInfo().dayName;
    }

    const scheduledClasses = [];

    subjects.forEach(subject => {
      if (Array.isArray(subject.timetable)) {
        subject.timetable.forEach(slot => {
          if (slot.day && slot.day.toLowerCase() === day.toLowerCase()) {
            const impact = AttendanceEngine.evaluateSingleClassImpact(
              subject.attended,
              subject.total,
              targetThreshold
            );

            scheduledClasses.push({
              subjectId: subject.id,
              subjectName: subject.name,
              subjectCode: subject.code || '',
              subjectColor: subject.color || '#8B5CF6',
              time: slot.time || 'Time not specified',
              room: slot.room || subject.room || 'TBD',
              instructor: subject.instructor || 'Faculty',
              currentAttended: subject.attended,
              currentTotal: subject.total,
              impact
            });
          }
        });
      }
    });

    // Sort by time if possible (simple heuristic)
    scheduledClasses.sort((a, b) => a.time.localeCompare(b.time));

    return {
      day,
      classes: scheduledClasses,
      count: scheduledClasses.length,
      hasCriticalClass: scheduledClasses.some(c => c.impact.current.status === 'CRITICAL'),
      highRiskCount: scheduledClasses.filter(c => c.impact.riskLevel === 'EXTREME' || c.impact.riskLevel === 'HIGH').length
    };
  },

  /**
   * Get full weekly timetable matrix
   */
  getWeeklyMatrix(subjects = []) {
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const matrix = {};

    weekDays.forEach(d => {
      matrix[d] = [];
    });

    subjects.forEach(sub => {
      if (Array.isArray(sub.timetable)) {
        sub.timetable.forEach(slot => {
          if (matrix[slot.day]) {
            matrix[slot.day].push({
              subjectId: sub.id,
              subjectName: sub.name,
              subjectCode: sub.code,
              time: slot.time,
              room: slot.room || sub.room
            });
          }
        });
      }
    });

    // Sort slots by time
    weekDays.forEach(d => {
      matrix[d].sort((a, b) => a.time.localeCompare(b.time));
    });

    return matrix;
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimetableEngine;
}
