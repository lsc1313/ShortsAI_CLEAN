// Schedule slot matching. Start only within a 90-second grace window,
// never catch up whole days of missed work on process startup.
export function isScheduledNow(job, now = new Date()) {
    const scheduled = new Date(now);
    scheduled.setHours(job.hour, job.minute, 0, 0);
    const delta = now.getTime() - scheduled.getTime();
    return delta >= 0 && delta < 90_000;
}
