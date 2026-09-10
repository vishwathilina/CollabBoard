const { createUploadthing } = require("uploadthing/express");
const { UploadThingError } = require("uploadthing/server");
const { z } = require("zod");
const { verifyToken } = require("../utils/tokens");
const taskRepo = require("../repos/task.repo");
const workspaceRepo = require("../repos/workspace.repo");
const userRepo = require("../repos/user.repo");
const attachmentRepo = require("../repos/attachment.repo");

const f = createUploadthing();

const uploadRouter = {
  taskAttachment: f({
    image: { maxFileSize: "8MB", maxFileCount: 5 },
    pdf: { maxFileSize: "8MB", maxFileCount: 5 },
    blob: { maxFileSize: "8MB", maxFileCount: 5 },
  })
    .input(z.object({ taskId: z.string().min(1, "taskId is required") }))
    .middleware(async ({ req, input }) => {
      // 1. Authenticate JWT
      const header = req.headers.authorization || req.headers["authorization"];
      if (!header || !header.startsWith("Bearer ")) {
        throw new UploadThingError({
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization header.",
        });
      }

      const token = header.split(" ")[1];
      let payload;
      try {
        payload = verifyToken(token);
      } catch (err) {
        throw new UploadThingError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired token.",
        });
      }

      const userId = payload.sub;
      let orgRole = payload.orgRole;
      if (!orgRole) {
        const user = await userRepo.findById(userId);
        orgRole = user?.orgRole || "developer";
      }

      // 2. Validate input task exists
      const task = await taskRepo.findById(input.taskId);
      if (!task) {
        throw new UploadThingError({
          code: "NOT_FOUND",
          message: `Task '${input.taskId}' not found.`,
        });
      }

      // 3. Ensure user can access that task's workspace
      const workspace = await workspaceRepo.findById(task.workspaceId);
      if (!workspace) {
        throw new UploadThingError({
          code: "NOT_FOUND",
          message: `Workspace '${task.workspaceId}' not found.`,
        });
      }

      const isSeniorPM =
        orgRole === "senior_project_manager" || orgRole === "admin";
      const wsMemberIds =
        workspace.memberIds || (workspace.members || []).map((m) => m.userId);
      const isMember =
        isSeniorPM || wsMemberIds.includes(userId) || workspace.ownerId === userId;

      if (!isMember) {
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace.",
        });
      }

      return { userId, taskId: input.taskId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const name = file.name || "attachment";
      const lowerName = name.toLowerCase();
      const fileType = file.type || "";

      let type = "doc";
      if (
        fileType.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(lowerName)
      ) {
        type = "image";
      } else if (
        fileType === "application/pdf" ||
        lowerName.endsWith(".pdf")
      ) {
        type = "pdf";
      }

      const url = file.ufsUrl || file.url;
      const fileKey = file.key;

      const attachment = await attachmentRepo.create({
        taskId: metadata.taskId,
        name,
        type,
        url,
        fileKey,
        addedBy: metadata.userId,
      });

      return {
        uploadedBy: metadata.userId,
        attachmentId: attachment.id,
        url,
      };
    }),
};

module.exports = { uploadRouter };
