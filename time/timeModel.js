const MINUTE = 60000,
  STEP = 5 * MINUTE;
export function validateRange(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return {
    ok: false,
    error: 'ref.errorInvalid'
  };
  return end > start ? {
    ok: true
  } : {
    ok: false,
    error: 'ref.errorEndNotAfterStart'
  };
}
export function createTimeModel({
  now = Date.now
} = {}) {
  let reference = null,
    shown, accumulated = 0;
  const listeners = new Set();
  const getShownTime = () => reference ? shown : now();

  function notify(previous) {
    const value = getShownTime();
    if (value !== previous)
      for (const fn of listeners) fn(value);
  }

  function setShownTime(ms) {
    if (!reference || !Number.isFinite(ms)) return getShownTime();
    const previous = shown;
    shown = Math.max(reference.start, Math.min(reference.end, ms));
    notify(previous);
    return shown;
  }
  return {
    isLive: () => reference === null,
    getShownTime,
    getReference: () => reference && {
      ...reference
    },
    setShownTime,
    setReference(start, end) {
      const result = validateRange(start, end);
      if (!result.ok) return result;
      const previous = getShownTime();
      reference = {
        start,
        end
      };
      shown = start;
      accumulated = 0;
      notify(previous);
      return result;
    },
    clearReference() {
      const previous = getShownTime();
      reference = null;
      accumulated = 0;
      notify(previous);
    },
    scrollBy(deltaY, deltaMode = 0) {
      const previous = getShownTime();
      if (!reference) return {
        shownTime: previous,
        changed: false,
        hint: 'ref.scrollHint'
      };
      accumulated += deltaY * (deltaMode === 1 ? 5 : deltaMode === 2 ? 15 : .15);
      const steps = Math.trunc((accumulated + Math.sign(accumulated) * 1e-9) / 5);
      if (steps) {
        accumulated -= steps * 5;
        setShownTime(Math.round((shown + steps * STEP) / STEP) * STEP);
      }
      return {
        shownTime: shown,
        changed: shown !== previous,
        hint: null
      };
    },
    stepBy(minutes) {
      return reference ? setShownTime(Math.round((shown + minutes * MINUTE) / STEP) * STEP) : getShownTime();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
