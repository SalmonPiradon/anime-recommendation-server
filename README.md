# 📌 Personal Blog API Server

> REST API for a personal anime and movie review blog — published articles, comments, likes, member profiles, and an admin panel for posts and categories.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)]()
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791.svg)]()
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)]()

**Live API:** https://anime-recommondation-server.onrender.com  
**Frontend:** https://github.com/SalmonPiradon/anime-recommondation

---

## 📖 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Authentication](#-authentication)
- [Demo Credentials](#-demo-credentials)
- [API Reference](#-api-reference)
- [Integration with Frontend](#-integration-with-frontend)
- [Deployment](#-deployment)
- [Known Limitations](#-known-limitations)
- [Contributors](#-contributors)
- [License](#-license)

---

## ✨ Features

- **Authentication** — email register and login through Supabase Auth; current user lookup; change password
- **Posts** — public list of published articles with keyword, category, and pagination; article detail
- **Comments** — list comments on a post; members can add a comment (max 500 characters)
- **Likes** — like count, like, and unlike for a logged-in user
- **Profile** — update name, username, and profile photo
- **Categories** — public list; admin create, update, and delete
- **Admin posts** — list drafts and published posts, create with a cover image, update, and delete

---

## 🛠️ Tech Stack

| Layer | Technology |
|--------|------------|
| **Runtime** | Node.js (ES modules, `.mjs`) |
| **Framework** | Express 5 |
| **Database** | PostgreSQL (`pg`) via `CONNECTION_STRING` |
| **Auth** | Supabase Auth (`signUp`, `signInWithPassword`, `getUser`) |
| **File upload** | multer (memory) → Supabase Storage bucket `my-personal-blog` |
| **Dev** | nodemon (`npm start`) |

---

## 🏗️ Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│  React client   │ ──────────────►│  Express API     │
│  (Vercel)       │   Bearer JWT   │  (Render)        │
└─────────────────┘                └────────┬─────────┘
                                            │
                         ┌──────────────────┼──────────────────┐
                         ▼                  ▼                  ▼
                  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
                  │ Supabase    │   │ PostgreSQL  │   │ Supabase    │
                  │ Auth        │   │             │   │ Storage     │
                  └─────────────┘   └─────────────┘   └─────────────┘
```

**Request flow:** `app.mjs` → `routes` → `protectUser` / `protectAdmin` → SQL or Supabase Storage

Tables used by the queries: `users`, `posts`, `categories`, `statuses`, `comments`, `likes`.

---

## 📁 Project Structure

```text
anime-recommendation-server/
├── app.mjs                      # Entry point, CORS, route mounts
├── package.json
├── routes/
│   ├── authRouter.mjs           # /auth
│   ├── postRouter.mjs           # /posts
│   ├── profileRouter.mjs        # /profile
│   └── categoryRouter.mjs       # /categories
├── middlewares/
│   ├── protectUser.mjs          # Valid Supabase token
│   ├── protectAdmin.mjs         # Token + users.role = admin
│   └── bodyValidation.mjs       # Required fields on create post
└── utils/db.mjs                 # pg Pool
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Postgres database with the tables above
- A Supabase project (Auth + Storage bucket `my-personal-blog`)

### Installation

```bash
git clone https://github.com/SalmonPiradon/anime-recommondation-server.git
cd anime-recommondation-server
npm install
```

### Environment

Create a `.env` file and fill in the values (see [Environment Variables](#-environment-variables)). **Do not commit `.env`.** It is listed in `.gitignore`.

### Run locally

```bash
npm start
```

This runs `nodemon app.mjs` at [http://localhost:4000](http://localhost:4000).

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CONNECTION_STRING` | Yes | Postgres connection string |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key used by Auth and Storage uploads |
| `PORT` | No | Default `4000` |

There is no `.env.example` in this repo.

---

## 🔑 Authentication

### Email register and login

| Endpoint | Description |
|----------|-------------|
| `POST /auth/register` | Supabase sign-up, then `INSERT` into `users` with role `user` |
| `POST /auth/login` | Returns `{ access_token }` |
| `GET /auth/get-user` | Bearer token → `{ id, email, username, name, role, profilePic }` |
| `PUT /auth/reset-password` | Bearer token + `{ oldPassword, newPassword }`; returns a new `access_token` when the new login succeeds |

Register body: `{ email, password, username, name }`. A taken username returns 400.

### Protected routes

```http
Authorization: Bearer <access_token>
```

- `protectUser` — any valid Supabase user (`comments`, `likes`, `profile`)
- `protectAdmin` — same check, then `users.role` must be `admin` (403 otherwise)

There is no signup path that creates an admin. Set `role` to `admin` in the database.

---

## 🧪 Demo Credentials

Log in on the frontend at [https://anime-recommondation.vercel.app/login](https://anime-recommondation.vercel.app/login).

| Field | Value |
|-------|-------|
| Email | `admin@gmail.com` |
| Password | `Password123` |

This account's role is `admin`.

---

## 📡 API Reference

Base URL: `http://localhost:4000` (local) · `https://anime-recommondation-server.onrender.com` (production)

> **Auth column:** `—` = public · `User` = logged-in user · `Admin` = `users.role` is `admin`

`status_id`: `1` = draft, `2` = published. The public list returns only status `2`.

### Auth — `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Create a member |
| POST | `/login` | — | Email login |
| GET | `/get-user` | User | Current profile |
| PUT | `/reset-password` | User | Change password |

### Posts — `/posts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | Published posts. Query: `page` (default 1), `limit` (default 6), `keyword`, `category` |
| GET | `/admin` | Admin | All posts, including drafts. Query: `page`, `limit` (default 10) |
| GET | `/admin/:postId` | Admin | One post for the edit form |
| GET | `/:postId` | — | One post (no publish filter) |
| POST | `/` | Admin | Create post. Multipart: `imageFile`, `title`, `category_id`, `description`, `content`, `status_id` |
| PUT | `/:postId` | Admin | Update post. Optional new `imageFile`; otherwise send the current `image` URL |
| DELETE | `/:postId` | Admin | Delete post |
| GET | `/:postId/comments` | — | Comments, newest first |
| POST | `/:postId/comments` | User | Body `{ comment }` — required, max 500 characters |
| GET | `/:postId/likes` | — | `{ like_count }` |
| POST | `/:postId/likes` | User | Like the post |
| DELETE | `/:postId/likes` | User | Remove the current user's like |

List responses look like `{ totalPosts, totalPages, currentPage, limit, posts, nextPage }`.

### Profile — `/profile`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | `/` | User | Update `name`, `username`, and optional `imageFile` |

### Categories — `/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | All categories |
| GET | `/:id` | — | One category |
| POST | `/` | Admin | Body `{ name }` |
| PUT | `/:id` | Admin | Body `{ name }` |
| DELETE | `/:id` | Admin | Delete category |

---

## 🔗 Integration with Frontend

| Item | Value |
|------|--------|
| Local API | `http://localhost:4000` |
| Production API | `https://anime-recommondation-server.onrender.com` |
| FE env | `VITE_API_BASE_URL` |
| CORS allowed | `http://localhost:5173`, `http://localhost:3000`, `https://anime-recommondation.vercel.app` |

Cover images and profile photos are uploaded to the Supabase bucket `my-personal-blog` (`posts/...` and `profiles/...`). The API stores the public URL.

---

## 🚢 Deployment

**Platform:** [Render](https://render.com) — `anime-recommondation-server.onrender.com`

1. Set [environment variables](#-environment-variables) on Render
2. Start command: `npm start`
3. Keep the production frontend origin in the CORS list in `app.mjs`

---

## ⚠️ Known Limitations

- **No notifications API** — the admin notification page in the frontend is mock data
- **Author is hardcoded** — post queries select `'Piradon L.' AS author`
- **`GET /posts/:id`** does not hide drafts
- **A second like** inserts again and fails if the row already exists; the client uses that failure to unlike
- **No test script** in `package.json`

---

## 👥 Contributors

| Name | GitHub | Contact |
|------|--------|---------|
| Piradon | [SalmonPiradon](https://github.com/SalmonPiradon) | [piradonleungamornnara@gmail.com](mailto:piradonleungamornnara@gmail.com) |

---

## 📄 License

This project is licensed under the **ISC** License — see `package.json`.
