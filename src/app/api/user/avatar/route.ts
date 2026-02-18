import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * POST /api/user/avatar
 * Upload a profile picture (base64 encoded)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const userId = session.user.id;

    // Extract base64 data and content type
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Validate file size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });
    }

    // Validate content type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
    }

    // Generate filename
    const ext = contentType.split("/")[1];
    const filename = `avatars/${userId}.${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from("public")
      .upload(filename, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // If bucket doesn't exist, try creating it
      if (uploadError.message?.includes("Bucket not found")) {
        // Create the bucket
        const { error: bucketError } = await adminClient.storage.createBucket("public", {
          public: true,
        });
        
        if (bucketError && !bucketError.message?.includes("already exists")) {
          console.error("Bucket creation error:", bucketError);
          return NextResponse.json({ error: "Failed to create storage" }, { status: 500 });
        }

        // Retry upload
        const { error: retryError } = await adminClient.storage
          .from("public")
          .upload(filename, buffer, {
            contentType,
            upsert: true,
          });

        if (retryError) {
          console.error("Retry upload error:", retryError);
          return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
      }
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from("public")
      .getPublicUrl(filename);

    const avatarUrl = urlData.publicUrl;

    // Update user record
    const { error: updateError } = await adminClient
      .from("users")
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      avatarUrl,
    });
  } catch (error) {
    console.error("Error in avatar upload:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/avatar
 * Remove profile picture
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const userId = session.user.id;

    // Clear avatar URL in database
    const { error: updateError } = await adminClient
      .from("users")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // Try to delete the file (don't fail if it doesn't exist)
    const extensions = ["jpg", "jpeg", "png", "gif", "webp"];
    for (const ext of extensions) {
      await adminClient.storage.from("public").remove([`avatars/${userId}.${ext}`]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in avatar delete:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
