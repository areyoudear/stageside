import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, message, email, timestamp, userAgent, url } = body;

    if (!message || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Format feedback for logging/storage
    const feedback = {
      type,
      message,
      email: email || null,
      timestamp,
      metadata: {
        userAgent,
        url,
      },
    };

    // Log feedback (always works, good for debugging)
    console.log("📝 New Feedback:", JSON.stringify(feedback, null, 2));

    // TODO: Store in Supabase when connected
    // const supabase = createClient();
    // await supabase.from('feedback').insert(feedback);

    // TODO: Optionally send email notification
    // await sendEmailNotification(feedback);

    // For now, store in a simple file-based approach in development
    if (process.env.NODE_ENV === "development") {
      // In production, this would go to a database
      console.log("✅ Feedback logged successfully");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving feedback:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
