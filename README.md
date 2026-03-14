# Bill Split

Full-stack bill-splitting app (React + Node/Express + MongoDB).

## One-time setup (after clone)

### 1. Server

```bash
cd server
npm install
```

Create `server/.env` (copy from `server/.env.example`). You **must** set:

- **MONGO_URI** – MongoDB connection string (e.g. from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

Optional: `PORT`, `CLIENT_URL`, `API_URL`, Resend keys for email.

Then run the database setup (if your project has one):

```bash
npm run setup-db
```

### 2. Client

```bash
cd client
npm install
```

Create `client/.env` with:

```
VITE_API_URL=http://localhost:5000
```

(Use the same port as your server `PORT`.)

---

## Run the app (every time)

The client talks to the API at `VITE_API_URL`. If the server is not running, you’ll see:  
*"Cannot connect to the server. Make sure the server is running and the URL in client .env (VITE_API_URL) is correct."*

**Start the server first, then the client.**

1. **Terminal 1 – API server**

   ```bash
   cd server
   npm run dev
   ```

   Wait until you see something like: `Server running on port 5000` and `MongoDB Connected`.

2. **Terminal 2 – React client**

   ```bash
   cd client
   npm run dev
   ```

   Open the URL shown (e.g. http://localhost:5173) and use the app.

---

## Quick checklist

| Step | Command / action |
|------|-------------------|
| 1 | `cd server` → `npm install` |
| 2 | Create `server/.env` with at least `MONGO_URI` |
| 3 | `npm run setup-db` (in `server`) |
| 4 | `cd ../client` → `npm install` |
| 5 | Create `client/.env` with `VITE_API_URL=http://localhost:5000` |
| 6 | **Start server:** `cd server` → `npm run dev` |
| 7 | **Start client:** `cd client` → `npm run dev` |

If you see "Cannot connect to the server", the server (step 6) is not running or not on the port in `VITE_API_URL`.
