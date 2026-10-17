// SafeDive Coach: a one-week practice plan from one scored lap, and its calendar export.
// Three short sessions: the drill twice, then film another lap so the next score shows whether it worked.

function makePlan(issueKey, drill, swimmerId, start = new Date()) {
  const day = n => { const d = new Date(start); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const name = drill ? drill.name : 'the drill';
  return {
    swimmerId: swimmerId || null, created: new Date(start).toISOString(), drillKey: issueKey || null,
    items: [
      { day: day(1), kind: 'drill', text: `Practise "${name}": ${drill ? drill.reps : 'a few short tries'}`, done: false },
      { day: day(3), kind: 'drill', text: `"${name}" again, a little longer`, done: false },
      { day: day(5), kind: 'film', text: 'Film one lap and score it', done: false },
    ],
  };
}

function planProgress(plan) { if (!plan || !plan.items.length) return 0; return plan.items.filter(i => i.done).length / plan.items.length; }

// iCalendar text for the plan, one all-day event per item. Opens in Apple/Google Calendar from a download.
function planToICS(plan, swimmerName) {
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SafeDive Coach//EN', 'CALSCALE:GREGORIAN'];
  plan.items.forEach((it, i) => {
    const d = it.day.replace(/-/g, ''); const next = new Date(it.day + 'T12:00:00'); next.setDate(next.getDate() + 1);
    lines.push('BEGIN:VEVENT', `UID:safedive-${plan.created.replace(/\D/g, '')}-${i}@safedive`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`,
      `SUMMARY:${esc('SafeDive' + (swimmerName ? ' · ' + swimmerName : '') + ': ' + (it.kind === 'film' ? 'film a lap' : 'swim drill'))}`, `DESCRIPTION:${esc(it.text)}`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

if (typeof module !== 'undefined') module.exports = { makePlan, planProgress, planToICS };
