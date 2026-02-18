import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface Concert {
  id: string;
  name: string;
  artists: string[];
  venue: {
    name: string;
    city: string;
    state?: string;
  };
  date: string;
  time?: string;
  ticketUrl?: string;
  matchScore?: number;
  imageUrl?: string;
}

interface ConcertNotificationEmailProps {
  to: string;
  userName: string;
  locationName: string;
  concerts: Concert[];
  filterDescription?: string;
}

export async function sendConcertNotificationEmail({
  to,
  userName,
  locationName,
  concerts,
  filterDescription,
}: ConcertNotificationEmailProps) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return { success: false, error: "Email not configured" };
  }

  const concertListHtml = concerts
    .map((concert) => {
      const dateFormatted = new Date(concert.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const matchBadge = concert.matchScore
        ? `<span style="background: ${concert.matchScore >= 70 ? "#22c55e" : concert.matchScore >= 40 ? "#eab308" : "#6b7280"}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${concert.matchScore}% match</span>`
        : "";

      return `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #fafafa;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h3 style="margin: 0 0 4px 0; color: #111827; font-size: 16px;">
                ${concert.artists?.join(", ") || concert.name}
              </h3>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                📅 ${dateFormatted}${concert.time ? ` at ${concert.time}` : ""}<br/>
                📍 ${concert.venue.name}, ${concert.venue.city}${concert.venue.state ? `, ${concert.venue.state}` : ""}
              </p>
              ${matchBadge}
            </div>
          </div>
          ${
            concert.ticketUrl
              ? `<a href="${concert.ticketUrl}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">Get Tickets →</a>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #06b6d4, #3b82f6); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎵 Stageside</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">New concerts for you!</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 24px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 8px 0;">
              Hey ${userName}! 👋
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px 0;">
              We found <strong>${concerts.length} new concert${concerts.length !== 1 ? "s" : ""}</strong> near ${locationName}${filterDescription ? ` ${filterDescription}` : ""}.
            </p>
            
            ${concertListHtml}
            
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://www.getstageside.com/dashboard" style="display: inline-block; padding: 12px 24px; background: #111827; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
                View All Concerts
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
              You're receiving this because you enabled concert notifications on Stageside.<br/>
              <a href="https://www.getstageside.com/settings" style="color: #06b6d4;">Manage notification settings</a>
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">
              Stageside · San Francisco, CA
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Generate plain text version
  const plainText = `
Hey ${userName}!

We found ${concerts.length} new concert${concerts.length !== 1 ? "s" : ""} near ${locationName}${filterDescription ? ` ${filterDescription}` : ""}.

${concerts
  .map((concert) => {
    const dateFormatted = new Date(concert.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short", 
      day: "numeric",
    });
    return `${concert.artists?.join(", ") || concert.name}
📅 ${dateFormatted}${concert.time ? ` at ${concert.time}` : ""}
📍 ${concert.venue.name}, ${concert.venue.city}${concert.venue.state ? `, ${concert.venue.state}` : ""}
${concert.ticketUrl ? `🎟️ ${concert.ticketUrl}` : ""}
`;
  })
  .join("\n")}

View all concerts: https://www.getstageside.com/dashboard

---
You're receiving this because you enabled concert notifications on Stageside.
Manage settings: https://www.getstageside.com/settings

Stageside
San Francisco, CA
`.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: "Stageside <notifications@getstageside.com>",
      to,
      subject: `🎵 ${concerts.length} new concert${concerts.length !== 1 ? "s" : ""} near ${locationName}`,
      html,
      text: plainText,
      headers: {
        "List-Unsubscribe": "<https://www.getstageside.com/settings>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: String(error) };
  }
}
