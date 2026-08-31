# CollabBoard API Reference

## 1. Purpose and Base URL
The CollabBoard API provides a RESTful interface to manage workspaces, tree nodes, tasks, messages, and attachments.
**Base URL**: `http://localhost:4000/api`

## 2. Auth Scheme and Demo Users
The API uses Bearer token authentication via JSON Web Tokens (JWT). 
Provide the token in the `Authorization` header: `Bearer <token>`.
**Demo Users**:
- ada@collabboard.local / CollabBoard!1

## 3. Envelope and Error Catalog
All responses are wrapped in a standard JSON envelope.
**Success Envelope**:
```json
{
  "success": true,
  "data": { ... } // or array
}
```
**Error Envelope**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": []
  }
}
```
**Error Codes**:
- `UNAUTHORIZED`: Missing or invalid token.
- `FORBIDDEN`: User does not have access.
- `NOT_FOUND`: Resource not found.
- `VALIDATION_ERROR`: Invalid request payload.
- `INTERNAL_SERVER_ERROR`: An unexpected error occurred.

## 4. Resource Model
- **User**: `id`, `name`, `email`, `avatarColor`
- **Workspace**: `id`, `name`, `description`, `memberIds`, `color`
- **TreeNode**: `id`, `workspaceId`, `parentId`, `name`, `completion`
- **Task**: `id`, `workspaceId`, `treeNodeId`, `column`, `title`, `description`, `priority`, `memberIds`, `startDate`, `dueDate`, `completion`
- **Message**: `id`, `taskId`, `authorId`, `text`, `createdAt`
- **Attachment**: `id`, `taskId`, `name`, `type`, `url`, `addedBy`
- **GanttRow**: `taskId`, `leftPercent`, `widthPercent`

## 5. Endpoints
### Auth
- `POST /auth/register` - Register user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout user

### Workspaces
- `GET /workspaces` - List workspaces
- `POST /workspaces` - Create workspace
- `GET /workspaces/:id` - Get workspace
- `PATCH /workspaces/:id` - Update workspace
- `DELETE /workspaces/:id` - Delete workspace
- `POST /workspaces/:id/members` - Add member
- `DELETE /workspaces/:id/members/:userId` - Remove member

### Tree Nodes
- `GET /workspaces/:id/tree` - List tree nodes for workspace
- `POST /workspaces/:id/tree` - Create tree node
- `GET /tree-nodes/:nodeId` - Get tree node
- `PATCH /tree-nodes/:nodeId` - Update tree node
- `DELETE /tree-nodes/:nodeId` - Delete tree node

### Tasks
- `GET /workspaces/:id/tasks` - List tasks for workspace (filters: `treeNode`, `column`)
- `POST /workspaces/:id/tasks` - Create task
- `GET /tasks/:taskId` - Get task
- `PATCH /tasks/:taskId` - Update task
- `PATCH /tasks/:taskId/move` - Move task to column
- `DELETE /tasks/:taskId` - Delete task

### Gantt
- `GET /workspaces/:id/gantt` - Get gantt data

### Messages
- `GET /tasks/:taskId/messages` - List messages
- `POST /tasks/:taskId/messages` - Create message
- `DELETE /messages/:messageId` - Delete message

### Attachments
- `GET /tasks/:taskId/attachments` - List attachments
- `POST /tasks/:taskId/attachments` - Create attachment
- `DELETE /attachments/:attachmentId` - Delete attachment

## 6. Gantt Derivation Formula
The Gantt chart is derived dynamically based on the tasks in the workspace.
- `leftPercent` and `widthPercent` are calculated using the earliest `startDate` and the latest `dueDate` across all tasks in the workspace, scaling each task's duration proportionally.

## 7. Postman Import Steps
1. Import `postman/CollabBoard.postman_collection.json`
2. Import `postman/CollabBoard.postman_environment.json`
3. Select the **CollabBoard Local** environment.
4. Run the **Auth -> Login (Ada)** request to set the `token` variable.
5. You can now run other endpoints.

## 8. Changelog
| Date | Member | Change |
|---|---|---|
| 2026-08-31 | Member 7 | Initial API reference |
