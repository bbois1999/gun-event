import { createUploadthing, type FileRouter } from "uploadthing/next";

// Enhanced logger
console.log("UploadThing initialization starting");
console.log("Environment:", {
  NODE_ENV: process.env.NODE_ENV,
  USING_SDK_V7_TOKEN: true
});

// SDK v7+ token format (base64 encoded JSON with apiKey, appId, and regions)
const HARDCODED_V7_TOKEN = 'eyJhcGlLZXkiOiJza19saXZlX2YzZmI3NTg3ZjNjOGI5MDNhZTY5NTI2MWIxODRhYzcwZTE4MjY0MDMxZTczNjkxMjI4NDYyZDk0NGI1ODRhMGYiLCJhcHBJZCI6ImFwN3l6YjlsNGkiLCJyZWdpb25zIjpbInNlYTEiXX0=';

const f = createUploadthing({
  errorFormatter: (err) => {
    console.error("UploadThing Error:", err);
    return { message: err.message };
  },
});

// Define file size and type restrictions
const MAX_FILE_SIZE = "4MB";

// Define our file router with extensive logging
export const ourFileRouter = {
  // Define a route for post image uploads with simplified middleware for testing
  postImage: f({ image: { maxFileSize: MAX_FILE_SIZE } })
    .middleware(async () => {
      console.log("UploadThing middleware processing request");
      // Force the v7+ token into the environment variable
      process.env.UPLOADTHING_TOKEN = HARDCODED_V7_TOKEN;
      return { userId: "test-user" };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      console.log("UploadThing upload successful:", file.url);
      
      return { 
        uploadedBy: metadata.userId,
        fileUrl: file.url,
        fileKey: file.key
      };
    }),
} satisfies FileRouter;

console.log("UploadThing router initialized");

export type OurFileRouter = typeof ourFileRouter; 