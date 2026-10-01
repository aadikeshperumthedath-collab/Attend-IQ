/**
 * AttendIQ - High Precision Attendance Engine
 * Mathematically sound calculations for Safe Misses (Bunk Budget),
 * Recovery Requirements, What-If Projections, and Edge Cases.
 */

const AttendanceEngine = {
  /**
   * Calculate attendance statistics for a single subject.
   * @param {number} attended - Number of attended classes
   * @param {number} total - Total classes conducted
   * @param {number} target - Target minimum percentage (e.g. 75)
   * @returns {Object} Calculated metrics
   */
  calculateSubject(attended, total, target = 75) {
    const att = Math.max(0, parseInt(attended, 10) || 0);
    let tot = Math.max(0, parseInt(total, 10) || 0);
    const tgt = Math.max(1, Math.min(99, parseFloat(target) || 75));

    // Edge case: attended cannot exceed total conducted
    if (att > tot) {
      tot = att;
    }

    // Edge case: No classes conducted yet
    if (tot === 0) {
      return {
        attended: 0,
        total: 0,
        percentage: 100.0,
        percentageStr: '100.0',
        target: tgt,
        status: 'SAFE',
        statusLabel: 'No Classes Yet',
        safeMisses: 0,
        recoveryClasses: 0,
        deltaToTarget: 100 - tgt,
        isNew: true,
        summaryText: 'No classes have been recorded yet.'
      };
    }

    const rawPct = (att / tot) * 100;
    const percentage = Math.round(rawPct * 10) / 10; // 1 decimal precision
    const deltaToTarget = Math.round((percentage - tgt) * 10) / 10;

    let status = 'SAFE';
    let statusLabel = 'Safe';
    let safeMisses = 0;
    let recoveryClasses = 0;
    let summaryText = '';

    if (percentage >= tgt) {
      // Formula: floor((100*A - T*C) / T)
      const allowedMisses = Math.floor((100 * att - tgt * tot) / tgt);
      safeMisses = Math.max(0, allowedMisses);
      recoveryClasses = 0;

      // Status classification
      if (safeMisses === 0 || deltaToTarget < 2.0) {
        status = 'WARNING';
        statusLabel = 'Warning (Borderline)';
        summaryText = safeMisses === 0
          ? `Borderline! Missing even 1 more class will drop you below ${tgt}%.`
          : `Only 1 safe absence remaining before reaching the danger zone.`;
      } else {
        status = 'SAFE';
        statusLabel = 'Safe';
        summaryText = `You can safely miss ${safeMisses} more class${safeMisses === 1 ? '' : 'es'} while staying above ${tgt}%.`;
      }
    } else {
      // Below threshold
      safeMisses = 0;
      status = 'CRITICAL';
      statusLabel = 'Critical (Below Target)';

      // Formula: ceil((T*C - 100*A) / (100 - T))
      const denom = 100 - tgt;
      if (denom > 0) {
        recoveryClasses = Math.ceil((tgt * tot - 100 * att) / denom);
        recoveryClasses = Math.max(1, recoveryClasses);
      } else {
        recoveryClasses = 999;
      }

      summaryText = `Attend the next ${recoveryClasses} consecutive class${recoveryClasses === 1 ? '' : 'es'} to recover to ${tgt}%.`;
    }

    return {
      attended: att,
      total: tot,
      percentage,
      percentageStr: percentage.toFixed(1),
      target: tgt,
      status,
      statusLabel,
      safeMisses,
      recoveryClasses,
      deltaToTarget,
      isNew: false,
      summaryText
    };
  },

  /**
   * Calculate aggregated metrics across all subjects.
   * @param {Array} subjects - List of subject objects
   * @param {number} target - Target minimum percentage
   * @returns {Object} Overall dashboard metrics
   */
  calculateOverall(subjects = [], target = 75) {
    const tgt = Math.max(1, Math.min(99, parseFloat(target) || 75));

    if (!subjects || subjects.length === 0) {
      return {
        totalAttended: 0,
        totalConducted: 0,
        overallPercentage: 100.0,
        overallPercentageStr: '100.0',
        target: tgt,
        status: 'SAFE',
        statusLabel: 'No Subjects Added',
        safeMisses: 0,
        recoveryClasses: 0,
        deltaToTarget: 100 - tgt,
        counts: { safe: 0, warning: 0, critical: 0, total: 0 },
        subjectStats: [],
        summaryText: 'Add your subjects to start tracking your attendance command center.'
      };
    }

    let sumAttended = 0;
    let sumConducted = 0;
    let safeCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    const subjectStats = subjects.map(sub => {
      const stats = this.calculateSubject(sub.attended, sub.total, tgt);
      sumAttended += stats.attended;
      sumConducted += stats.total;

      if (stats.status === 'SAFE') safeCount++;
      else if (stats.status === 'WARNING') warningCount++;
      else if (stats.status === 'CRITICAL') criticalCount++;

      return {
        ...sub,
        stats
      };
    });

    if (sumConducted === 0) {
      return {
        totalAttended: 0,
        totalConducted: 0,
        overallPercentage: 100.0,
        overallPercentageStr: '100.0',
        target: tgt,
        status: 'SAFE',
        statusLabel: 'No Classes Conducted',
        safeMisses: 0,
        recoveryClasses: 0,
        deltaToTarget: 100 - tgt,
        counts: { safe: safeCount, warning: warningCount, critical: criticalCount, total: subjects.length },
        subjectStats,
        summaryText: 'Zero classes recorded so far.'
      };
    }

    const rawOverall = (sumAttended / sumConducted) * 100;
    const overallPercentage = Math.round(rawOverall * 10) / 10;
    const deltaToTarget = Math.round((overallPercentage - tgt) * 10) / 10;

    let status = 'SAFE';
    let statusLabel = 'Safe';
    let safeMisses = 0;
    let recoveryClasses = 0;
    let summaryText = '';

    if (overallPercentage >= tgt) {
      safeMisses = Math.max(0, Math.floor((100 * sumAttended - tgt * sumConducted) / tgt));
      recoveryClasses = 0;

      if (safeMisses === 0 || deltaToTarget < 2.0 || criticalCount > 0) {
        status = 'WARNING';
        statusLabel = criticalCount > 0 ? 'Warning (Subject in Danger)' : 'Warning (Borderline)';
        summaryText = criticalCount > 0
          ? `Overall attendance is ${overallPercentage.toFixed(1)}%, but ${criticalCount} subject${criticalCount > 1 ? 's are' : ' is'} below threshold.`
          : `You are near the threshold with ${safeMisses} overall safe misses remaining.`;
      } else {
        status = 'SAFE';
        statusLabel = 'Safe';
        summaryText = `You can safely miss ${safeMisses} more class${safeMisses === 1 ? '' : 'es'} overall while maintaining ≥ ${tgt}%.`;
      }
    } else {
      status = 'CRITICAL';
      statusLabel = 'Critical (Action Required)';
      safeMisses = 0;
      const denom = 100 - tgt;
      recoveryClasses = denom > 0 ? Math.ceil((tgt * sumConducted - 100 * sumAttended) / denom) : 0;
      recoveryClasses = Math.max(1, recoveryClasses);
      summaryText = `Overall attendance is ${overallPercentage.toFixed(1)}%. Attend the next ${recoveryClasses} classes across your courses to reach ${tgt}%.`;
    }

    return {
      totalAttended: sumAttended,
      totalConducted: sumConducted,
      overallPercentage,
      overallPercentageStr: overallPercentage.toFixed(1),
      target: tgt,
      status,
      statusLabel,
      safeMisses,
      recoveryClasses,
      deltaToTarget,
      counts: { safe: safeCount, warning: warningCount, critical: criticalCount, total: subjects.length },
      subjectStats,
      summaryText
    };
  },

  /**
   * Interactive What-If Scenario Simulator
   * @param {Object} current - { attended, total }
   * @param {Object} scenario - { type: 'miss'|'attend'|'both', missCount: number, attendCount: number }
   * @param {number} target - Target percentage
   */
  simulate(current, scenario, target = 75) {
    const curAtt = Math.max(0, parseInt(current.attended, 10) || 0);
    const curTot = Math.max(curAtt, parseInt(current.total, 10) || 0);
    const tgt = parseFloat(target) || 75;

    const missCount = Math.max(0, parseInt(scenario.missCount, 10) || 0);
    const attendCount = Math.max(0, parseInt(scenario.attendCount, 10) || 0);

    const projectedAtt = curAtt + attendCount;
    const projectedTot = curTot + attendCount + missCount;

    const currentStats = this.calculateSubject(curAtt, curTot, tgt);
    const projectedStats = this.calculateSubject(projectedAtt, projectedTot, tgt);

    const deltaPct = Math.round((projectedStats.percentage - currentStats.percentage) * 10) / 10;
    const deltaClasses = (attendCount + missCount);

    let narrative = '';
    if (deltaClasses === 0) {
      narrative = 'No future classes simulated yet. Adjust the sliders to see what happens.';
    } else if (missCount > 0 && attendCount === 0) {
      if (projectedStats.status === 'CRITICAL' && currentStats.status !== 'CRITICAL') {
        narrative = `⚠️ Danger! Missing ${missCount} class${missCount > 1 ? 'es' : ''} drops your attendance from ${currentStats.percentageStr}% to ${projectedStats.percentageStr}%, triggering CRITICAL status.`;
      } else if (projectedStats.status === 'CRITICAL') {
        narrative = `Missing ${missCount} more class${missCount > 1 ? 'es' : ''} deepens your attendance deficit to ${projectedStats.percentageStr}%. You will need ${projectedStats.recoveryClasses} classes to recover.`;
      } else {
        narrative = `Missing ${missCount} class${missCount > 1 ? 'es' : ''} reduces your attendance to ${projectedStats.percentageStr}%. You still have ${projectedStats.safeMisses} safe absences left.`;
      }
    } else if (attendCount > 0 && missCount === 0) {
      if (currentStats.status === 'CRITICAL' && projectedStats.percentage >= tgt) {
        narrative = `🎉 Awesome! Attending the next ${attendCount} class${attendCount > 1 ? 'es' : ''} successfully recovers your attendance to ${projectedStats.percentageStr}%, crossing your ${tgt}% target!`;
      } else if (currentStats.status === 'CRITICAL') {
        narrative = `Attending ${attendCount} class${attendCount > 1 ? 'es' : ''} boosts your attendance to ${projectedStats.percentageStr}%, leaving only ${projectedStats.recoveryClasses} more to fully recover.`;
      } else {
        narrative = `Attending ${attendCount} class${attendCount > 1 ? 'es' : ''} increases your attendance to ${projectedStats.percentageStr}% (+${deltaPct}%), expanding your safe budget to ${projectedStats.safeMisses} classes.`;
      }
    } else {
      narrative = `Attending ${attendCount} and missing ${missCount} results in ${projectedStats.percentageStr}% (${deltaPct >= 0 ? '+' : ''}${deltaPct}%). Status: ${projectedStats.status}.`;
    }

    return {
      current: currentStats,
      projected: projectedStats,
      deltaPct,
      deltaClasses,
      narrative
    };
  },

  /**
   * Generate step-by-step recovery milestones for subjects below target.
   * @param {number} attended
   * @param {number} total
   * @param {number} target
   * @returns {Array} Milestones
   */
  generateRecoveryRoadmap(attended, total, target = 75) {
    const stats = this.calculateSubject(attended, total, target);
    if (stats.percentage >= target) {
      return [];
    }

    const totalNeeded = stats.recoveryClasses;
    const roadmap = [];

    for (let step = 1; step <= totalNeeded; step++) {
      const stepAtt = stats.attended + step;
      const stepTot = stats.total + step;
      const stepPct = Math.round(((stepAtt / stepTot) * 100) * 10) / 10;
      const isGoal = step === totalNeeded || stepPct >= target;

      roadmap.push({
        step,
        classesAttended: step,
        classesRemaining: Math.max(0, totalNeeded - step),
        projectedPct: stepPct,
        projectedPctStr: stepPct.toFixed(1),
        isGoal,
        label: isGoal ? `Goal Reached (≥ ${target}%)` : `Class ${step} (+${Math.round((stepPct - stats.percentage)*10)/10}%)`
      });
    }

    return roadmap;
  },

  /**
   * Evaluates the impact of single tomorrow class (Present vs Absent)
   * @param {number} attended
   * @param {number} total
   * @param {number} target
   */
  evaluateSingleClassImpact(attended, total, target = 75) {
    const curStats = this.calculateSubject(attended, total, target);

    // If attend tomorrow:
    const attendStats = this.calculateSubject(curStats.attended + 1, curStats.total + 1, target);
    // If miss tomorrow:
    const missStats = this.calculateSubject(curStats.attended, curStats.total + 1, target);

    const attendDelta = Math.round((attendStats.percentage - curStats.percentage) * 10) / 10;
    const missDelta = Math.round((missStats.percentage - curStats.percentage) * 10) / 10;

    let riskLevel = 'LOW';
    let recommendation = 'Safe to attend or miss within budget.';

    if (curStats.status === 'CRITICAL') {
      riskLevel = 'EXTREME';
      recommendation = 'Must attend! Already below minimum requirement.';
    } else if (missStats.percentage < target) {
      riskLevel = 'HIGH';
      recommendation = 'High risk: Missing tomorrow drops you directly into CRITICAL!';
    } else if (missStats.safeMisses === 0) {
      riskLevel = 'MODERATE';
      recommendation = 'Caution: Missing leaves 0 safe absences remaining.';
    } else {
      riskLevel = 'LOW';
      recommendation = `Healthy buffer: You will still have ${missStats.safeMisses} safe absences left if you miss.`;
    }

    return {
      current: curStats,
      ifAttend: {
        stats: attendStats,
        delta: attendDelta,
        deltaStr: (attendDelta >= 0 ? '+' : '') + attendDelta.toFixed(1) + '%'
      },
      ifMiss: {
        stats: missStats,
        delta: missDelta,
        deltaStr: missDelta.toFixed(1) + '%'
      },
      riskLevel,
      recommendation
    };
  }
};

// Export for module/browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AttendanceEngine;
}
