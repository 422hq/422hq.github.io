const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul', day: '2-digit', month: 'short', year: 'numeric',
});

export function startClock(element) {
  const update = () => {
    const now = new Date();
    element.dateTime = now.toISOString();
    element.querySelector('.clock-time').textContent = `${timeFormat.format(now)} KST`;
    element.querySelector('.clock-date').textContent = dateFormat.format(now).toUpperCase();
  };
  update();
  const interval = setInterval(update, 1000);
  return () => clearInterval(interval);
}
