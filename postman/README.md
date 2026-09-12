# Postman — CollabBoard API

Importable collection for the **in-memory** Express API (no database).

## Files

| File | Role |
|---|---|
| [CollabBoard.postman_collection.json](./CollabBoard.postman_collection.json) | Requests, folders, test scripts |
| [CollabBoard.postman_environment.json](./CollabBoard.postman_environment.json) | `baseUrl`, `token`, seed ids |

## Import (Postman Desktop or web)

1. **Import** → select both JSON files.
2. Top-right environment dropdown → **CollabBoard Local**.
3. Start the API: `cd backend && npm run dev` (after Member 1).
4. Open folder **Auth** → **Login (Ada)** → Send. Tests copy the JWT into `token`.
5. Run other folders. Protected routes send `Authorization: Bearer {{token}}`.

Collection Runner: run **Auth / Login (Ada)** first, then the rest.

## Newman (CLI)

```powershell
npx newman run postman/CollabBoard.postman_collection.json -e postman/CollabBoard.postman_environment.json
```

Health and login work without other members’ routes; remaining folders return 404 until those PRs merge.

## Demo credentials

`ada@collabboard.local` / `CollabBoard!1`

## Related

- [API reference](../docs/api/API-REFERENCE.md)
- [OpenAPI](../docs/api/openapi.yaml)
- [Backend plan](../collabboard-backend-plan.md)
