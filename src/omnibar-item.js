import React from 'react';

// https://stackoverflow.com/a/53800501
const units = {
  year  : 24 * 60 * 60 * 1000 * 365,
  month : 24 * 60 * 60 * 1000 * 365/12,
  day   : 24 * 60 * 60 * 1000,
  hour  : 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function getRelativeTime(d1, d2 = new Date()) {
  const elapsed = d1 - d2;

  // "Math.abs" accounts for both "past" & "future" scenarios
  for (const u in units) {
    if (Math.abs(elapsed) > units[u] || u === 'second')  {
      return rtf.format(Math.round(elapsed / units[u]), u)
    }
  }
}

window.omnibar.register('schedule-item', ({ data, isLocked, isActive, isTransitioning, isOverlay }) => {
  const relativeTime = window.omnibar.useMemo(() => {
    if (data.isNext) return 'Up next';

    return getRelativeTime(new Date(data.estimatedStart));
  }, [data.isNext, data.estimatedStart]);

  return (
    <div className="schedule-item-container">
      <div className="schedule-item-time">{relativeTime}</div>
      <div className="schedule-item-data">
        <div className="schedule-item-runner">
          {data.runners.join(', ')} run{data.runners.length === 1 ? 's' : ''}
        </div>
        <div className="schedule-item-title">
          {data.game}
        </div>
      </div>
    </div>
  );
});
