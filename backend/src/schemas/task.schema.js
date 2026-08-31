const { z } = require("zod");

const workspaceIdParamSchema = z.object({
  id: z.string().min(1, "Workspace id is required"),
});

const taskIdParamSchema = z.object({
  taskId: z.string().min(1, "Task id is required"),
});

const columnEnum = z.enum(["todo", "in_progress", "review", "done"]);
const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);

const isoDateString = z.string().min(1, "Date must be a non-empty ISO string");

function datesRefine(data) {
  if (!data.startDate || !data.dueDate) return true;
  return Date.parse(data.dueDate) >= Date.parse(data.startDate);
}

const taskListQuerySchema = z.object({
  treeNode: z.string().min(1).optional(),
  column: columnEnum.optional(),
});

const taskCreateSchema = z
  .object({
    treeNodeId: z.string().min(1, "treeNodeId is required"),
    column: columnEnum,
    title: z.string().min(1, "title is required").trim(),
    description: z.string().optional(),
    priority: priorityEnum,
    memberIds: z.array(z.string().min(1)).optional(),
    startDate: isoDateString,
    dueDate: isoDateString,
    completion: z.number().min(0).max(100).optional(),
  })
  .refine(datesRefine, {
    message: "dueDate must be on or after startDate",
    path: ["dueDate"],
  });

const taskPatchSchema = z
  .object({
    treeNodeId: z.string().min(1).optional(),
    column: columnEnum.optional(),
    title: z.string().min(1).trim().optional(),
    description: z.string().optional(),
    priority: priorityEnum.optional(),
    memberIds: z.array(z.string().min(1)).optional(),
    startDate: isoDateString.optional(),
    dueDate: isoDateString.optional(),
    completion: z.number().min(0).max(100).optional(),
    version: z.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .refine(
    (data) => {
      if (data.startDate === undefined || data.dueDate === undefined) return true;
      return datesRefine({ startDate: data.startDate, dueDate: data.dueDate });
    },
    { message: "dueDate must be on or after startDate", path: ["dueDate"] },
  );

const taskMoveSchema = z.object({
  column: columnEnum,
});

module.exports = {
  workspaceIdParamSchema,
  taskIdParamSchema,
  taskListQuerySchema,
  taskCreateSchema,
  taskPatchSchema,
  taskMoveSchema,
  columnEnum,
  priorityEnum,
};
