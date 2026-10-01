/**
 * AttendIQ - Intelligent Attendance Assistant Engine
 * Pure data-driven, calculation-focused assistant that answers
 * student questions using their exact live attendance records.
 */

const AssistantEngine = {
  // Preset suggested questions for instant query
  suggestedQuestions: [
    'Can I miss tomorrow\'s OS class?',
    'How many classes can I safely bunk right now?',
    'Which subject has the lowest attendance?',
    'What happens if I take tomorrow completely off?',
    'How do I recover Operating Systems back to 75%?'
  ],

  /**
   * Find matching subject by alias or name from subjects array
   */
  findSubject(query, subjects = []) {
    const q = query.toLowerCase();

    // Alias map for common college subject acronyms
    const aliases = {
      'os': ['operating systems', 'os'],
      'dsa': ['data structures', 'dsa', 'data structures & algorithms'],
      'dbms': ['database', 'dbms', 'database management'],
      'math': ['discrete mathematics', 'math', 'mathematics', 'discrete math'],
      'cn': ['computer networks', 'networks', 'cn', 'networking'],
      'cloud': ['cloud & web architecture', 'cloud', 'web', 'architecture', 'web tech']
    };

    // First check exact code or alias
    for (const sub of subjects) {
      const code = (sub.code || '').toLowerCase();
      const name = sub.name.toLowerCase();

      if (q.includes(code)) return sub;
      if (q.includes(name)) return sub;

      for (const [aliasKey, synonyms] of Object.entries(aliases)) {
        if (synonyms.some(s => name.includes(s))) {
          if (synonyms.some(s => q.includes(s)) || q.includes(aliasKey)) {
            return sub;
          }
        }
      }
    }

    // Secondary partial keyword match
    for (const sub of subjects) {
      const words = sub.name.toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && q.includes(w)) {
          return sub;
        }
      }
    }

    return null;
  },

  /**
   * Process a natural language question and return a calculation-backed answer
   * @param {string} rawQuery
   * @param {Object} state - full app state { user, subjects, calendar }
   */
  ask(rawQuery, state) {
    const query = rawQuery.trim().toLowerCase();
    const subjects = state.subjects || [];
    const target = state.user?.target || 75;
    const overall = AttendanceEngine.calculateOverall(subjects, target);

    if (subjects.length === 0) {
      return {
        reply: `You haven't added any subjects yet. Click **+ Add Subject** or **Try Demo** on the top bar to populate your schedule, and I'll analyze every class for you.`,
        action: 'add_subject'
      };
    }

    // 1. Check for specific subject inquiry
    const matchedSubject = this.findSubject(query, subjects);

    // Intent: Can I miss / skip / bunk a specific subject or tomorrow?
    const isMissQuery = query.includes('miss') || query.includes('bunk') || query.includes('skip') || query.includes('absent');
    const isTomorrowQuery = query.includes('tomorrow') || query.includes('next');
    const isRecoveryQuery = query.includes('recover') || query.includes('fix') || query.includes('catch up') || query.includes('get back');
    const isLowestQuery = query.includes('lowest') || query.includes('worst') || query.includes('danger') || query.includes('failing');
    const isHighestQuery = query.includes('highest') || query.includes('best') || query.includes('safest');
    const isBudgetQuery = query.includes('budget') || query.includes('how many') || query.includes('safe to miss');
    const isDayOffQuery = (query.includes('day off') || query.includes('all classes') || query.includes('completely off'));

    // Handle single subject miss question
    if (matchedSubject && (isMissQuery || isTomorrowQuery)) {
      const stats = AttendanceEngine.calculateSubject(matchedSubject.attended, matchedSubject.total, target);
      const impact = AttendanceEngine.evaluateSingleClassImpact(matchedSubject.attended, matchedSubject.total, target);

      if (stats.status === 'CRITICAL') {
        return {
          reply: `**No, you should NOT miss ${matchedSubject.name} (${matchedSubject.code}).**\n\n` +
            `• **Current Attendance:** ${stats.percentageStr}% (${stats.attended}/${stats.total} classes) — 🔴 **CRITICAL**\n` +
            `• **If you miss:** It will plunge to **${impact.ifMiss.stats.percentageStr}%** (${impact.ifMiss.deltaStr}), increasing your recovery requirement to **${impact.ifMiss.stats.recoveryClasses} classes**.\n` +
            `• **Verdict:** You must attend upcoming classes consecutively to recover above your ${target}% threshold.`
        };
      } else if (stats.safeMisses === 0) {
        return {
          reply: `⚠️ **Warning:** Your ${matchedSubject.name} attendance is currently **${stats.percentageStr}%**, which is right on the boundary of ${target}%.\n\n` +
            `• **Safe absences remaining:** **0 classes**.\n` +
            `• **If you miss:** It will drop to **${impact.ifMiss.stats.percentageStr}%**, immediately triggering **CRITICAL status**.\n` +
            `• **Recommendation:** Do not miss unless an emergency.`
        };
      } else {
        return {
          reply: `✅ **Yes, you can afford to miss 1 class of ${matchedSubject.name}.**\n\n` +
            `• **Current Attendance:** ${stats.percentageStr}% (${stats.attended}/${stats.total} classes) — 🟢 **SAFE**\n` +
            `• **Current Safe Miss Budget:** **${stats.safeMisses} classes**.\n` +
            `• **If you miss:** Your attendance will become **${impact.ifMiss.stats.percentageStr}%** (${impact.ifMiss.deltaStr}), and you will still retain **${impact.ifMiss.stats.safeMisses} safe absences** above ${target}%.`
        };
      }
    }

    // Handle Recovery query for subject
    if (matchedSubject && isRecoveryQuery) {
      const stats = AttendanceEngine.calculateSubject(matchedSubject.attended, matchedSubject.total, target);
      if (stats.percentage >= target) {
        return {
          reply: `Good news! **${matchedSubject.name}** is already above your threshold at **${stats.percentageStr}%** (Target: ${target}%). You don't need recovery — you actually have **${stats.safeMisses} safe absences** banked!`
        };
      }
      return {
        reply: `🎯 **Recovery Roadmap for ${matchedSubject.name}:**\n\n` +
          `• **Current Standing:** ${stats.percentageStr}% (${stats.attended}/${stats.total} classes)\n` +
          `• **Consecutive Classes Required:** **${stats.recoveryClasses} classes**\n` +
          `• **Target:** After attending ${stats.recoveryClasses} classes without missing, your attendance will climb to **${target.toFixed(1)}%+**.\n` +
          `• **Tip:** Check the **Recovery Plans** tab to see your projected milestone date.`
      };
    }

    // Handle Lowest / Critical Subject Query
    if (isLowestQuery) {
      const sorted = [...subjects].sort((a, b) => {
        const pctA = (a.attended / Math.max(1, a.total));
        const pctB = (b.attended / Math.max(1, b.total));
        return pctA - pctB;
      });
      const lowest = sorted[0];
      const lowestStats = AttendanceEngine.calculateSubject(lowest.attended, lowest.total, target);

      return {
        reply: `🚨 **Most Critical Subject:**\n\n` +
          `• **${lowest.name} (${lowest.code})** is your lowest subject at **${lowestStats.percentageStr}%** (${lowest.attended}/${lowest.total}).\n` +
          `• **Status:** ${lowestStats.status === 'CRITICAL' ? '🔴 CRITICAL' : '⚠️ WARNING'}\n` +
          `• **Action Needed:** ${lowestStats.status === 'CRITICAL' ? `Attend next **${lowestStats.recoveryClasses} consecutive classes** to recover.` : `Only **${lowestStats.safeMisses} safe misses** left.`}`
      };
    }

    // Handle Safest / Highest Subject Query
    if (isHighestQuery) {
      const sorted = [...subjects].sort((a, b) => {
        const pctA = (a.attended / Math.max(1, a.total));
        const pctB = (b.attended / Math.max(1, b.total));
        return pctB - pctA;
      });
      const highest = sorted[0];
      const stats = AttendanceEngine.calculateSubject(highest.attended, highest.total, target);

      return {
        reply: `🏆 **Safest Subject:**\n\n` +
          `• **${highest.name} (${highest.code})** has your strongest attendance at **${stats.percentageStr}%** (${highest.attended}/${highest.total}).\n` +
          `• **Attendance Budget:** You can safely miss up to **${stats.safeMisses} classes** while remaining above ${target}%.`
      };
    }

    // Handle Tomorrow's Schedule / Taking day off
    if (isTomorrowQuery || isDayOffQuery) {
      const sched = TimetableEngine.getScheduleForDay(subjects, null, target);
      if (sched.count === 0) {
        return {
          reply: `You don't have any classes scheduled for **${sched.day}** in your timetable. You have a free day!`
        };
      }

      let text = `📅 **Tomorrow's Schedule (${sched.day} - ${sched.count} classes):**\n\n`;
      let canMissAll = true;

      sched.classes.forEach(c => {
        const isCritical = c.impact.current.status === 'CRITICAL';
        if (isCritical || c.impact.ifMiss.stats.percentage < target) {
          canMissAll = false;
        }
        text += `• **${c.time}** — ${c.subjectName} (${c.subjectCode}): Currently **${c.impact.current.percentageStr}%** [${c.impact.current.status}]\n` +
                `   If missed ➔ ${c.impact.ifMiss.stats.percentageStr}%\n`;
      });

      if (canMissAll) {
        text += `\n✅ **Verdict:** You have sufficient buffer across tomorrow's subjects, but do so wisely to preserve your budget.`;
      } else {
        text += `\n⚠️ **Verdict:** Taking tomorrow completely off will cause high damage because you have subjects already in CRITICAL or borderline status. Attend the high-risk sessions!`;
      }

      return { reply: text };
    }

    // Handle Overall Budget Query
    if (isBudgetQuery || query.includes('bunk') || query.includes('overall')) {
      return {
        reply: `📊 **Your Attendance Command Center Summary:**\n\n` +
          `• **Overall Attendance:** **${overall.overallPercentageStr}%** (${overall.totalAttended}/${overall.totalConducted} classes)\n` +
          `• **Target Requirement:** ${target}%\n` +
          `• **Overall Attendance Budget:** ${overall.status === 'CRITICAL' ? `🔴 **RECOVERY REQUIRED** (Attend next ${overall.recoveryClasses} classes)` : `🟢 **${overall.safeMisses} Classes** you can safely miss overall`}\n` +
          `• **Subject Health:** ${overall.counts.safe} Safe • ${overall.counts.warning} Warning • ${overall.counts.critical} Critical\n\n` +
          `Want to simulate a specific skip? Try the **What-If Simulator**!`
      };
    }

    // Default intelligent fallback
    return {
      reply: `Here's a quick look at your current standing across **${subjects.length} subjects**:\n\n` +
        `• **Overall Attendance:** **${overall.overallPercentageStr}%** (${overall.totalAttended}/${overall.totalConducted})\n` +
        `• **Status:** **${overall.status}**\n` +
        `• **Safe Absence Budget:** **${overall.safeMisses} classes**\n\n` +
        `💡 You can ask me:\n` +
        `1. *"Can I miss tomorrow's OS class?"*\n` +
        `2. *"Which subject needs urgent recovery?"*\n` +
        `3. *"How many total classes can I safely bunk?"*`
    };
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AssistantEngine;
}
