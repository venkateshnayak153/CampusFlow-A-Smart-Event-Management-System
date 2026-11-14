/**
 * Clock Service
 * Single source of truth for the current instant across the entire backend.
 * Required by brain.md (Section 0, 3.4).
 * Never read Date.now() or new Date() directly in business logic.
 */

let simulatedTime = null; // null means use system real time
let timeOffsetMs = 0;

export const clockService = {
  /**
   * Return current instant as a Date object.
   * If simulation is active, returns simulated or offset time.
   */
  now() {
    if (simulatedTime !== null) {
      return new Date(simulatedTime);
    }
    if (timeOffsetMs !== 0) {
      return new Date(Date.now() + timeOffsetMs);
    }
    return new Date();
  },

  /**
   * Freeze the clock at a specific instant (Date object or ISO string).
   */
  setFixedTime(instant) {
    simulatedTime = new Date(instant).getTime();
  },

  /**
   * Advance the current time by a duration in milliseconds (or seconds/hours).
   */
  advanceTime(ms) {
    if (simulatedTime !== null) {
      simulatedTime += ms;
    } else {
      timeOffsetMs += ms;
    }
  },

  /**
   * Reset clock back to normal system real-time.
   */
  resetClock() {
    simulatedTime = null;
    timeOffsetMs = 0;
  },

  /**
   * Helper to check if clock is simulated
   */
  isSimulated() {
    return simulatedTime !== null || timeOffsetMs !== 0;
  }
};
