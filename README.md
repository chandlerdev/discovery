# DESSS Discovery & Proposal Portal — Next.js + Spring Boot + MySQL

Three independent applications:

| Folder      | What it is                            | Stack                          | Dev port |
|-------------|---------------------------------------|--------------------------------|----------|
| `backend/`  | REST API                              | Spring Boot 3.3, Java 17, Maven| **8080** |
| `admin/`    | Team portal (9-step internal workflow)| Next.js 15, React 18, TypeScript| **3001** |
| `frontend/` | Public client questionnaire + proposal| Next.js 15, React 18, TypeScript| **3000** |

Both Next.js apps are standalone: each has its own `package.json`, `tsconfig.json`,
`.env.local`, and `src/{app,components,lib}` tree. They share no code at build time —
`lib/types.ts` and `lib/defaults.ts` are intentionally duplicated so either app can be
deployed on its own.

## Prerequisites
- Java 17+ and Maven (`mvn -v`)
- Node.js 18+ (`node -v`)
- MySQL running (XAMPP works — start MySQL in the XAMPP control panel)

## 1 · Database (phpMyAdmin)
The database `freshbyte_portal` is auto-created on first backend start
(`createDatabaseIfNotExist=true`). To create it manually instead: New → name
`freshbyte_portal` → Create. If your MySQL root has a password, set it in
`backend/src/main/resources/application.properties`.

Three tables, auto-created by JPA: `clients`, `project_docs` (one JSON document per
client), `questionnaire_def` (the single published questionnaire).

## 2 · Backend
```bash
cd backend
mvn spring-boot:run
```
Runs on **http://localhost:8080**. On first start it creates the tables and seeds the
FreshBytes client. Settings in `application.properties`:
- `portal.team-passcode` — change from `desss2026`
- `portal.cors-origins` — comma-separated; defaults to `http://localhost:3000,http://localhost:3001`

### Package layout
```
com.desss.portal
├── config/       WebConfig (CORS), DataInitializer (seed), GlobalExceptionHandler
├── controller/   AuthController, ClientController, DocController, QuestionnaireController
├── dto/          request/response records — ApiResponse, LoginRequest/Response, Client*
├── entity/       Client, ProjectDoc, QuestionnaireDef
├── repository/   Spring Data JPA interfaces
├── security/     TeamPasscodeGuard (X-Team-Passcode header check)
├── service/      AuthService, ClientService, ProjectDocService, QuestionnaireService
└── PortalApplication.java
```
Controllers stay thin — all logic lives in `service/`.

### API summary
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/login | — | Validate role/name/passcode |
| GET | /api/questionnaire | — | Published questionnaire (404 = use built-in default) |
| PUT | /api/questionnaire | X-Team-Passcode | Publish questionnaire |
| GET/PUT | /api/docs/{cid} | — | Read/save a client's JSON document |
| GET | /api/clients | X-Team-Passcode | List clients |
| POST | /api/clients | X-Team-Passcode | Create client (+empty doc) |
| DELETE | /api/clients/{id} | X-Team-Passcode | Remove from list (doc kept) |
| GET | /api/clients/{id}/public | — | Company name for the client page header |

## 3 · Frontend (public client site)
```bash
cd frontend
npm install
npm run dev
```
Runs on **http://localhost:3000**. Client links are `/q/<client-id>`.

`.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 4 · Admin (team portal)
```bash
cd admin
npm install
npm run dev
```
Runs on **http://localhost:3001** — log in with role + name + team passcode.

`.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # where client questionnaire links point
```

> **`NEXT_PUBLIC_SITE_URL` matters.** The Clients tab builds each client's link as
> `${NEXT_PUBLIC_SITE_URL}/q/<id>`. Because the admin now runs on its own origin, this
> can no longer be derived from the browser's location — point it at the public site or
> you'll hand clients a link into the internal portal.

## 5 · Smoke test
1. Start MySQL → backend → frontend → admin.
2. Open `http://localhost:3001`, log in as Admin (passcode `desss2026`).
3. Clients tab → create a test client → link is copied (it points at :3000).
4. Open the link in an incognito window → answer a question → Save.
5. Portal → Refresh data → the answer appears in Discovery Review.
6. Full flow: Review → Assign → Estimate (developer role) → Approve → Proposal
   (copy source, rates, theme, submit) → client accepts (+PDF) → Handover → client signs off.

## Production notes
- `npm run build && npm run start` per Next app; `mvn package` produces a runnable JAR
  (`java -jar target/portal-api-1.0.0.jar`).
- Put all three behind HTTPS. Restrict `portal.cors-origins` to the real deployed
  origins, and set `NEXT_PUBLIC_SITE_URL` to the public domain.
- The admin app should not be publicly reachable — put it behind a VPN, IP allowlist,
  or SSO.
- The passcode guard is intentionally simple. Upgrade path: Spring Security + JWT with
  per-user accounts; also split `PUT /api/docs/{cid}` into a client route (answers,
  acceptance, sign-off only) and a passcode-guarded admin route for workflow fields.
- Back up the `freshbyte_portal` database — export from phpMyAdmin any time.
