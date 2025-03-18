import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/lib/uploadthing";
import { NextRequest, NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

// Create an instance of the UploadThing API
const utapi = new UTApi();

// Export the standard UploadThing API route handler
export const { GET, POST: originalPost } = createRouteHandler({
  router: ourFileRouter,
});

// Override the POST handler to handle direct file uploads
export async function POST(req: NextRequest) {
  console.log("UploadThing API route initializing");
  
  // If it's a standard UploadThing request, use the original handler
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return originalPost(req);
  }
  
  // If it's a FormData request, handle it directly
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    
    console.log(`Processing ${files.length} files for upload`);
    
    // Upload each file to UploadThing
    const uploadPromises = files.map(async (file: any) => {
      if (!(file instanceof File)) {
        throw new Error("Invalid file object");
      }
      
      const response = await utapi.uploadFiles(file);
      
      // Check if response or response.data is null
      if (!response || !response.data) {
        throw new Error("Upload failed - empty response from UploadThing");
      }
      
      return {
        url: response.data.url,
        key: response.data.key,
      };
    });
    
    const results = await Promise.all(uploadPromises);
    console.log(`Successfully uploaded ${results.length} files`);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error handling file upload:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
} 