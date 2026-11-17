# 🛡️ RC Gudalur Admin Panel

A modern, full-featured admin dashboard for managing the RC Gudalur community platform. Built with **Next.js 16**, **React 19**, **Convex**, and **TailwindCSS**.

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)
![Convex](https://img.shields.io/badge/Convex-Backend-EE342F)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)

---

## ✨ Features

### 📊 Dashboard
- **Real-time statistics** for events, board members, community ads, and contact messages
- **Recent messages** with read/unread indicators
- **Upcoming events** preview
- **Active ad carousel** overview
- **Quick action shortcuts** for common tasks

### 📅 Events Management
- Create, edit, and delete community events
- Mark events as upcoming or past
- Event gallery with multiple image support
- Date picker integration

### 📢 Community Ads
- **Multi-ad carousel system** with configurable display order
- **Drag-and-drop reordering** using dnd-kit
- Configurable **display duration** per ad
- Toggle ads active/inactive status
- Image upload to Convex file storage

### 👥 Board Members
- Manage organization board members
- Add photos and roles
- CSV import functionality

### 💬 Contact Submissions
- View and manage contact form submissions
- Mark messages as read/unread
- Track message history

### 🎨 UI/UX
- **Dark/Light mode toggle** with system preference detection
- **Responsive design** - works on desktop and mobile
- **Resizable sidebar** with drag handle
- Modern glassmorphism effects and smooth animations
- Custom themed scrollbars

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0 or later
- **pnpm** (recommended) or npm
- Access to the shared **Convex** deployment (its functions live in the website repo, `peterish8/rc-gudalur`, under `convex/`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/rcgudalur-admin.git
   cd rcgudalur-admin
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud   # same URL as the website
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🗄️ Database Schema

The panel reads and writes these Convex tables (schema: `convex/schema.ts` in the website repo), so changes show up on the website immediately:

| Table | Description |
|-------|-------------|
| `events` | Community events with dates, descriptions, and gallery images |
| `community_ads` | Advertisement carousel with display order and duration |
| `board_members` | Organization board member profiles |
| `contact_submissions` | Contact form entries from the public website |

---

## 📁 Project Structure

```
rcgudalur-admin/
├── app/                     # Next.js App Router pages
│   ├── dashboard/           # Main dashboard
│   ├── events/              # Events management
│   ├── community-ads/       # Ad carousel management
│   ├── board-members/       # Board member management
│   ├── contact-submissions/ # Message inbox
│   └── login/               # Authentication
├── components/              # Reusable React components
│   ├── Layout.tsx           # Main layout with sidebar
│   ├── ThemeProvider.tsx    # Dark/light mode context
│   ├── ProtectedRoute.tsx   # Auth guard component
│   ├── Modal.tsx            # Reusable modal component
│   └── ConfirmDialog.tsx    # Confirmation dialog
├── contexts/                # React context providers
│   └── AuthContext.tsx      # Authentication state
├── lib/                     # Utilities and helpers
│   └── convex.ts            # Convex client, session token, file upload helpers
└── public/                  # Static assets
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Frontend** | React 19, TypeScript |
| **Styling** | TailwindCSS 3.4 |
| **Backend/DB** | Convex (shared with the website) |
| **Auth** | Convex session token (ADMIN_EMAIL / ADMIN_PASSWORD env vars) |
| **Icons** | Lucide React |
| **Forms** | React Hook Form |
| **Drag & Drop** | @dnd-kit |
| **Date Handling** | date-fns |
| **CSV Parsing** | PapaParse |

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Create production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

---

## 🔐 Authentication

The admin panel signs in against the `ADMIN_EMAIL` / `ADMIN_PASSWORD` Convex environment variables (`npx convex env set ...` in the website repo) and keeps a 30-day session token. All admin reads and writes check that token on the server. Protected routes automatically redirect unauthenticated users to the login page.

---

## 🎯 Roadmap

- [ ] Role-based access control (RBAC)
- [ ] Email notifications for new messages
- [ ] Analytics dashboard
- [ ] Member directory management
- [ ] Bulk operations for events/ads

---

## 📄 License

This project is private and intended for RC Gudalur community use.

---

## 🤝 Contributing

For contributions or issues, please contact the development team.

---

<div align="center">
  <strong>Built with ❤️ for RC Gudalur Community</strong>
</div>
