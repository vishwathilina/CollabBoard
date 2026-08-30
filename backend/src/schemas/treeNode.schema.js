const { z } = require("zod");

const workspaceIdParamSchema = z.object({
  id: z.string().min(1, "Workspace id is required"),
});

const treeNodeIdParamSchema = z.object({
  nodeId: z.string().min(1, "Tree node id is required"),
});

const treeCreateSchema = z.object({
  parentId: z.string().min(1, "parentId must be a non-empty string").nullable().optional(),
  name: z.string().min(1, "name is required").trim(),
  completion: z.number().min(0, "completion must be >= 0").max(100, "completion must be <= 100").optional(),
});

const treePatchSchema = z
  .object({
    parentId: z.string().min(1, "parentId must be a non-empty string").nullable().optional(),
    name: z.string().min(1, "name must be non-empty").trim().optional(),
    completion: z.number().min(0, "completion must be >= 0").max(100, "completion must be <= 100").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field (name, parentId, completion) must be provided",
  });

module.exports = {
  workspaceIdParamSchema,
  treeNodeIdParamSchema,
  treeCreateSchema,
  treePatchSchema,
};
