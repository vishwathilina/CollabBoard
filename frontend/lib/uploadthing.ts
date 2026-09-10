import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { FileRoute } from "uploadthing/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type OurFileRouter = {
  taskAttachment: FileRoute<{
    input: { taskId: string };
    output: { uploadedBy: string; attachmentId: string; url: string };
    errorShape: { message: string };
  }>;
};

export const UploadButton = generateUploadButton<OurFileRouter>({
  url: `${API_URL}/api/uploadthing`,
});

export const UploadDropzone = generateUploadDropzone<OurFileRouter>({
  url: `${API_URL}/api/uploadthing`,
});
