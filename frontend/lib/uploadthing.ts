import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { FileRoute } from "uploadthing/types";
import { getUploadThingUrl } from "@/lib/api";

export type OurFileRouter = {
  taskAttachment: FileRoute<{
    input: { taskId: string };
    output: { uploadedBy: string; attachmentId: string; url: string };
    errorShape: { message: string };
  }>;
};

export const UploadButton = generateUploadButton<OurFileRouter>({
  url: getUploadThingUrl(),
});

export const UploadDropzone = generateUploadDropzone<OurFileRouter>({
  url: getUploadThingUrl(),
});
