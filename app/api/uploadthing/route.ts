import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/lib/uploadthing";

console.log("UploadThing API route initializing");

// Set the SDK v7+ token format
process.env.UPLOADTHING_TOKEN = 'eyJhcGlLZXkiOiJza19saXZlX2YzZmI3NTg3ZjNjOGI5MDNhZTY5NTI2MWIxODRhYzcwZTE4MjY0MDMxZTczNjkxMjI4NDYyZDk0NGI1ODRhMGYiLCJhcHBJZCI6ImFwN3l6YjlsNGkiLCJyZWdpb25zIjpbInNlYTEiXX0=';
// No need for separate APP_ID with the v7+ token format

// Export routes for Next.js API
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
}); 