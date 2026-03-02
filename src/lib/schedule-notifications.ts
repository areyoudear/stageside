/**
 * Schedule Notifications
 * 
 * Handles notifications for schedule drops and meetup updates
 */

import { createAdminClient } from "./supabase";

interface CrewNotificationData {
  crewId: string;
  crewName: string;
  memberUserIds: string[];
}

interface ScheduleDropNotification {
  festivalId: string;
  festivalName: string;
  crews: CrewNotificationData[];
}

/**
 * Check if a festival's schedule just dropped (has times now but didn't before)
 */
export async function checkScheduleDrop(
  festivalId: string
): Promise<{ isNewDrop: boolean; hasSchedule: boolean }> {
  const supabase = createAdminClient();

  // Check if schedule exists (artists have start_time)
  const { count: scheduledCount } = await supabase
    .from("festival_artists")
    .select("*", { count: "exact", head: true })
    .eq("festival_id", festivalId)
    .not("start_time", "is", null);

  const hasSchedule = (scheduledCount || 0) > 0;

  if (!hasSchedule) {
    return { isNewDrop: false, hasSchedule: false };
  }

  // Check if we've already recorded this drop
  const { data: existingDrop } = await supabase
    .from("festival_schedule_drops")
    .select("id")
    .eq("festival_id", festivalId)
    .single();

  if (existingDrop) {
    return { isNewDrop: false, hasSchedule: true };
  }

  // This is a new schedule drop!
  return { isNewDrop: true, hasSchedule: true };
}

/**
 * Record a schedule drop and get crews to notify
 */
export async function recordScheduleDrop(
  festivalId: string
): Promise<ScheduleDropNotification | null> {
  const supabase = createAdminClient();

  // Get festival info
  const { data: festival } = await supabase
    .from("festivals")
    .select("id, name")
    .or(`id.eq.${festivalId},slug.eq.${festivalId}`)
    .single();

  if (!festival) return null;

  // Record the drop
  await supabase.from("festival_schedule_drops").upsert({
    festival_id: festival.id,
    dropped_at: new Date().toISOString(),
  });

  // Get all crews for this festival
  const { data: crews } = await supabase
    .from("festival_crews")
    .select(`
      id,
      name,
      members:festival_crew_members(user_id)
    `)
    .eq("festival_id", festival.id);

  if (!crews || crews.length === 0) return null;

  const crewData: CrewNotificationData[] = crews.map((c) => ({
    crewId: c.id,
    crewName: c.name || "Your Crew",
    memberUserIds: (c.members as { user_id: string }[]).map((m) => m.user_id),
  }));

  return {
    festivalId: festival.id,
    festivalName: festival.name,
    crews: crewData,
  };
}

/**
 * Get user notification preferences and tokens
 */
export async function getUserPushTokens(
  userIds: string[]
): Promise<Map<string, string[]>> {
  const supabase = createAdminClient();

  // Get push tokens from user_push_tokens table
  const { data: tokens } = await supabase
    .from("user_push_tokens")
    .select("user_id, token, platform")
    .in("user_id", userIds)
    .eq("enabled", true);

  const userTokens = new Map<string, string[]>();

  for (const t of tokens || []) {
    const existing = userTokens.get(t.user_id) || [];
    existing.push(t.token);
    userTokens.set(t.user_id, existing);
  }

  return userTokens;
}

/**
 * Send schedule drop push notifications
 * This is a placeholder - integrate with your push service (Expo, FCM, etc.)
 */
export async function sendScheduleDropNotifications(
  notification: ScheduleDropNotification
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Collect all unique user IDs
  const allUserIds: string[] = [];
  for (const crew of notification.crews) {
    for (const userId of crew.memberUserIds) {
      if (!allUserIds.includes(userId)) {
        allUserIds.push(userId);
      }
    }
  }

  // Get push tokens
  const userTokens = await getUserPushTokens(allUserIds);

  // For each user, send notification
  const userIds = Array.from(userTokens.keys());
  for (const userId of userIds) {
    const tokens = userTokens.get(userId) || [];
    // Find which crew(s) this user is in
    const userCrews = notification.crews.filter((c) =>
      c.memberUserIds.includes(userId)
    );

    const crewNames = userCrews.map((c) => c.crewName).join(", ");
    const title = `🎪 ${notification.festivalName} Schedule DROPPED!`;
    const body = `Set times are live! Check your crew schedule${
      userCrews.length > 1 ? "s" : ""
    } for ${crewNames}.`;

    for (const token of tokens) {
      try {
        // TODO: Integrate with your push notification service
        // Example for Expo:
        // await fetch('https://exp.host/--/api/v2/push/send', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     to: token,
        //     title,
        //     body,
        //     data: {
        //       type: 'schedule_drop',
        //       festivalId: notification.festivalId,
        //     },
        //   }),
        // });

        console.log(`Would send push to ${token}: ${title} - ${body}`);
        sent++;
      } catch (error) {
        console.error(`Failed to send push to ${token}:`, error);
        failed++;
      }
    }
  }

  // Mark crews as notified
  const supabase = createAdminClient();
  await supabase
    .from("festival_schedule_drops")
    .update({
      notified_crews: notification.crews.map((c) => c.crewId),
    })
    .eq("festival_id", notification.festivalId);

  return { sent, failed };
}

/**
 * Check and notify for schedule drop (call this after importing/updating festival schedule)
 */
export async function checkAndNotifyScheduleDrop(
  festivalId: string
): Promise<{ notified: boolean; crewCount: number }> {
  const { isNewDrop, hasSchedule } = await checkScheduleDrop(festivalId);

  if (!isNewDrop || !hasSchedule) {
    return { notified: false, crewCount: 0 };
  }

  const notification = await recordScheduleDrop(festivalId);

  if (!notification || notification.crews.length === 0) {
    return { notified: false, crewCount: 0 };
  }

  await sendScheduleDropNotifications(notification);

  return {
    notified: true,
    crewCount: notification.crews.length,
  };
}
