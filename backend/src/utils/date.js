function toMinutes(hhmmss) {
  const [hh, mm] = String(hhmmss).split(':').map((v) => Number(v));
  return (hh * 60) + mm;
}

function calcDurationHours(startTime, endTime) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (end <= start) {
    return null;
  }
  return (end - start) / 60;
}

module.exports = {
  calcDurationHours
};
