/**
 * Calendar Export - ICS Generation
 * 
 * Generates ICS (iCalendar) files for festival schedules
 */

import type { ScheduledArtist, CrewSchedule } from "./schedule-planner";

interface CalendarEvent {
  uid: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  categories?: string[];
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Format date for ICS (YYYYMMDDTHHMMSS)
 */
function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Parse festival date + time to Date object
 * @param festivalDate - "2026-04-10" format
 * @param time - "14:00" format
 */
function parseDateTime(festivalDate: string, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(festivalDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Generate ICS content for a single event
 */
function generateEvent(event: CalendarEvent): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(event.start)}`,
    `DTEND:${formatICSDate(event.end)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    `LOCATION:${escapeICS(event.location)}`,
  ];

  if (event.categories?.length) {
    lines.push(`CATEGORIES:${event.categories.join(",")}`);
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

/**
 * Generate complete ICS calendar file
 */
export function generateICS(
  events: CalendarEvent[],
  calendarName: string
): string {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Stageside//Festival Schedule//EN",
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ].join("\r\n");

  const footer = "END:VCALENDAR";
  const eventContent = events.map(generateEvent).join("\r\n");

  return `${header}\r\n${eventContent}\r\n${footer}`;
}

/**
 * Convert crew schedule to calendar events
 */
export function scheduleToCalendarEvents(
  schedules: CrewSchedule[],
  festivalName: string,
  festivalDates: { [day: string]: string }, // {"Friday": "2026-04-10", "Saturday": "2026-04-11"}
  crewName?: string
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const prefix = crewName ? `[${crewName}] ` : "";

  for (const daySchedule of schedules) {
    const dateStr = festivalDates[daySchedule.day];
    if (!dateStr) continue;

    // Add scheduled sets
    for (const slot of daySchedule.slots) {
      const crewNames = slot.crewAttending.map((c) => c.displayName).join(", ");
      const meetupLabel = slot.isMeetup && slot.meetupType === "all-crew" 
        ? " 📍 CREW MEETUP" 
        : "";
      
      events.push({
        uid: `stageside-${slot.artist.id}-${dateStr}@stageside.app`,
        title: `${prefix}${slot.artist.artistName}${meetupLabel}`,
        description: [
          `🎤 ${slot.artist.artistName}`,
          `📍 ${slot.artist.stage}`,
          slot.artist.headliner ? "⭐ Headliner" : "",
          "",
          `👥 Crew attending: ${crewNames}`,
          slot.artist.genres.length ? `🎵 ${slot.artist.genres.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        location: `${slot.artist.stage} - ${festivalName}`,
        start: parseDateTime(dateStr, slot.timeSlot.startTime),
        end: parseDateTime(dateStr, slot.timeSlot.endTime),
        categories: ["Festival", "Music", ...slot.artist.genres],
      });
    }

    // Add conflict markers (optional - helps visualize splits)
    for (const conflict of daySchedule.conflicts) {
      const options = conflict.options.map((o) => o.artist.artistName).join(" vs ");
      
      events.push({
        uid: `stageside-conflict-${conflict.timeSlot.startMinutes}-${dateStr}@stageside.app`,
        title: `${prefix}⚡ SPLIT: ${options}`,
        description: [
          "⚡ Crew split during this time!",
          "",
          ...conflict.options.map(
            (o) =>
              `${o.artist.artistName} @ ${o.artist.stage}: ${o.crewMembers
                .map((c) => c.displayName)
                .join(", ")}`
          ),
          "",
          conflict.suggestedMeetup
            ? `💡 ${conflict.suggestedMeetup.message}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
        location: festivalName,
        start: parseDateTime(dateStr, conflict.timeSlot.startTime),
        end: parseDateTime(dateStr, conflict.timeSlot.endTime),
        categories: ["Festival", "Conflict"],
      });
    }
  }

  return events;
}

/**
 * Export crew schedule to ICS
 */
export function exportCrewScheduleToICS(
  schedules: CrewSchedule[],
  festivalName: string,
  festivalDates: { [day: string]: string },
  crewName?: string
): string {
  const events = scheduleToCalendarEvents(
    schedules,
    festivalName,
    festivalDates,
    crewName
  );

  const calendarName = crewName
    ? `${festivalName} - ${crewName}`
    : festivalName;

  return generateICS(events, calendarName);
}

/**
 * Generate download filename
 */
export function getICSFilename(festivalName: string, crewName?: string): string {
  const sanitized = (str: string) =>
    str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-");
  
  const base = sanitized(festivalName);
  const crew = crewName ? `-${sanitized(crewName)}` : "";
  
  return `${base}${crew}-schedule.ics`;
}
