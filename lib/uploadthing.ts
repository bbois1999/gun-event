import { createUploadthing, type FileRouter } from "uploadthing/next";

// Enhanced logger
console.log("UploadThing initialization starting");
console.log("Environment:", {
  NODE_ENV: process.env.NODE_ENV,
  // Only log whether the token is set, not the actual value for security
  TOKEN_SET: !!process.env.UPLOADTHING_TOKEN
});

const f = createUploadthing();

const auth = (req: Request) => ({ id: "fakeId" }); // Fake auth function

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique route key
  profileImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const user = await auth(req);

      // If you throw, the user will not be able to upload
      if (!user) throw new Error("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);

      console.log("file url", file.url);
    }),
  
  // Route for post images
  postImage: f({ image: { maxFileSize: "16MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      // For now, we're allowing all uploads
      // In a real app, you'd want to check if the user is authenticated
      return { userId: "any" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Post image uploaded:", file.url);
      return { url: file.url, key: file.key };
    }),
} satisfies FileRouter;

console.log("UploadThing router initialized");

export type OurFileRouter = typeof ourFileRouter; 