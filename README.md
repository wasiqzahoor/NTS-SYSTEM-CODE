# NTS Management System

A robust, hierarchical project management platform built with Next.js, featuring real-time collaboration, automated notifications, and advanced project visualization tools.

## Features

- **3-Tier Role System**: Super Admin, Team Manager, Staff Member
- **Visual Project Management**: Kanban Board & Gantt Chart views
- **Real-Time Collaboration**: Task-specific chat and live notifications
- **Automated Email Notifications**: EmailJS integration for onboarding and updates
- **File Uploads**: Cloudinary integration for secure file storage
- **Dark/Light Mode**: Custom themed UI
- **Responsive Design**: Mobile, tablet, and desktop compatible
- **Activity Logs**: Full audit trail
- **PDF & Excel Exports**: Reporting capabilities

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js with Credentials Provider
- **Styling**: Tailwind CSS with Custom Themes
- **Real-Time**: Socket.io
- **Email**: EmailJS
- **File Storage**: Cloudinary
- **Drag & Drop**: @hello-pangea/dnd
- **Charts**: Custom Gantt Chart

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd nts-management-system
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/nts-management?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# EmailJS
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your-public-key
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your-service-id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your-template-id
```

### 3. Setup MongoDB

1. Create a MongoDB Atlas cluster
2. Create a database named `nts-management`
3. Copy your connection string to `MONGODB_URI`

### 4. Setup Cloudinary

1. Create a Cloudinary account
2. Get your Cloud Name, API Key, and API Secret
3. Add them to `.env.local`

### 5. Setup EmailJS

1. Create an EmailJS account
2. Create an email service
3. Create an email template
4. Get your Public Key, Service ID, and Template ID
5. Add them to `.env.local`

### 6. Run Development Server

```bash
# For Socket.io support (recommended)
node server.js

# Or standard Next.js dev server
npm run dev
```

### 7. Create First Super Admin

You need to manually create the first super admin in MongoDB:

```javascript
// Use MongoDB Compass or mongosh
db.users.insertOne({
  name: "Super Admin",
  email: "admin@nts.com",
  password: "$2a$12$...", // bcrypt hashed password
  role: "super_admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Or use the API endpoint after setting up:

```bash
curl -X POST http://localhost:3000/api/managers   -H "Content-Type: application/json"   -d '{"name":"Admin","email":"admin@nts.com","phone":"","department":""}'
```

## Project Structure

```
NTS-MANAGEMENT-SYSTEM/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/             # Utility functions & configs
│   ├── models/          # MongoDB Mongoose models
│   ├── types/           # TypeScript types
│   └── hooks/           # Custom React hooks
├── server.js            # Custom server with Socket.io
└── package.json
```

## User Roles & Permissions

### Super Admin
- View global statistics
- Create/manage Team Managers
- System audit logs
- Full platform access

### Team Manager
- Add/manage Staff Members
- Create projects and tasks
- Review and approve tasks
- Team performance overview

### Staff Member
- View assigned projects and tasks
- Update task status
- Upload proof of work
- Priority-based task sorting

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel Dashboard
4. Deploy

**Note**: For Socket.io on Vercel, you may need to use Vercel's Edge Runtime or a separate server.

### Alternative Deployment

Use a VPS or cloud provider (AWS, DigitalOcean, etc.) with PM2:

```bash
npm run build
pm2 start server.js --name "nts-management"
```

## API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/[...nextauth]` | ALL | Authentication | No |
| `/api/managers` | GET/POST/PATCH/DELETE | Manager management | Super Admin |
| `/api/staff` | GET/POST/PATCH/DELETE | Staff management | Manager/Admin |
| `/api/projects` | GET/POST/PATCH/DELETE | Project management | Manager/Admin |
| `/api/tasks` | GET/POST/PATCH/DELETE | Task management | All roles |
| `/api/upload` | POST | File upload | All roles |
| `/api/chat` | GET/POST | Task chat | All roles |
| `/api/notifications` | GET/PATCH/DELETE | Notifications | All roles |
| `/api/activity-logs` | GET/POST | Activity logs | All roles |

## License

MIT License - feel free to use for personal or commercial projects.

## Support

For issues or questions, please contact the development team.

---

**Built with ❤️ by the NTS Team**
