# 🏠 GharBazaar - Premium Real Estate Marketplace

<div align="center">

![GharBazaar Logo](https://img.shields.io/badge/GharBazaar-Real%20Estate-pink?style=for-the-badge)

**India's Most Trusted Platform for Buying, Selling, and Renting Properties**

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Firebase](https://img.shields.io/badge/Firebase-10.0-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Ready-black?style=flat-square&logo=vercel)](https://vercel.com/)

[Live Demo](#) • [Documentation](../README.md) • [Report Bug](#) • [Request Feature](#)

</div>

---

## 🌟 Features

### 🔐 **Authentication & Security**
- 🔑 Email/Password authentication
- 🌐 Google Sign-In integration
- 📱 Phone OTP verification
- 🔒 Firebase-powered security
- 🛡️ JWT token authentication

### 🏘️ **Property Management**
- 📋 Browse verified properties
- 🔍 Advanced search and filters
- ⭐ Featured listings
- 📸 Property details with images
- 📍 Location-based search
- 💰 Price range filters

### 💼 **Bidding System**
- 💵 Place bids on properties
- ⏱️ Real-time bid tracking
- 📊 Bid history and status
- 🏆 Seller bid management
- 🔔 Bid notifications

### 👤 **User Dashboard**
- 📝 Manage your listings
- 📈 Track your bids
- ❤️ Favorites collection
- 👤 Profile management
- 💬 Message center
- 📊 Analytics and insights

### 👨‍💼 **Admin Portal**
- 👥 User management
- 📋 Listing moderation
- 💳 Payment tracking
- 📊 Analytics dashboard
- 🔧 System tools
- 👷 Employee management

### 🏢 **Employee Portal**
- 📞 Lead management
- ✅ Property verification
- 🆔 KYC processing
- 🎫 Issue tracking
- 💬 Customer support

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MongoDB Atlas account
- Firebase account

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/gharbazaar.git
cd gharbazaar

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Configuration

1. **Backend Environment** (`backend/.env`)
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
```

2. **Frontend Environment** (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
# ... other Firebase config
```

### Run Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit: http://localhost:3000

---

## 📁 Project Structure

```
gharbazaar/
├── frontend/                 # Next.js 14 application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── lib/             # Utilities & configs
│   │   └── styles/          # Global styles
│   └── public/              # Static assets
│
├── backend/                  # Express.js API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Custom middleware
│   │   ├── services/        # Business logic
│   │   └── index.ts         # Entry point
│   └── scripts/             # Utility scripts
│
├── docs/                     # Documentation
├── .github/                  # GitHub configs
└── documentation-archive/    # Historical docs
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand, React Context
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Authentication**: Firebase Auth
- **Real-time**: Socket.io Client

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT + Firebase Admin
- **Real-time**: Socket.io
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer + AWS S3

### DevOps & Deployment
- **Hosting**: Vercel
- **Database**: MongoDB Atlas
- **Authentication**: Firebase
- **CI/CD**: GitHub Actions
- **Version Control**: Git & GitHub

---

## 📊 API Documentation

### Authentication Endpoints
```
POST   /api/auth/register      # Register new user
POST   /api/auth/login         # Login user
POST   /api/auth/logout        # Logout user
GET    /api/auth/me            # Get current user
POST   /api/auth/refresh       # Refresh token
```

### Listings Endpoints
```
GET    /api/listings           # Get all listings
GET    /api/listings/:id       # Get single listing
POST   /api/listings           # Create listing (auth)
PUT    /api/listings/:id       # Update listing (auth)
DELETE /api/listings/:id       # Delete listing (auth)
```

### Bids Endpoints
```
GET    /api/bids               # Get user bids (auth)
POST   /api/bids               # Place bid (auth)
PUT    /api/bids/:id           # Update bid (auth)
DELETE /api/bids/:id           # Cancel bid (auth)
```

---

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git push origin main
```

2. **Deploy Frontend**
- Import repository in Vercel
- Set root directory to `frontend`
- Add environment variables
- Deploy

3. **Deploy Backend**
- Import same repository
- Set root directory to `backend`
- Add environment variables
- Deploy

See [DEPLOYMENT_READY.md](../DEPLOYMENT_READY.md) for detailed instructions.

---

## 🧪 Testing

```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd backend
npm test

# Run system health check
node check-system.js
```

---

## 📈 Performance

- ⚡ **Lighthouse Score**: 95+
- 🚀 **First Contentful Paint**: < 1.5s
- 📊 **Time to Interactive**: < 3.5s
- 🎯 **Core Web Vitals**: All Green

---

## 🔒 Security

- 🔐 Firebase Authentication
- 🛡️ JWT token validation
- 🔒 HTTPS enforced
- 🚫 XSS protection
- 🛡️ CSRF protection
- 🔐 Environment variables secured
- 🚨 Rate limiting enabled
- 🔒 Helmet security headers

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

- **Developer**: Your Name
- **Designer**: Your Name
- **Project Manager**: Your Name

---

## 📞 Support

- 📧 Email: support@gharbazaar.com
- 💬 Discord: [Join our community](#)
- 🐦 Twitter: [@gharbazaar](#)
- 📱 Phone: +91 XXXXX XXXXX

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Firebase](https://firebase.google.com/)
- [MongoDB](https://www.mongodb.com/)
- [Vercel](https://vercel.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

<div align="center">

**Made with ❤️ in India**

[⬆ Back to Top](#-gharbazaar---premium-real-estate-marketplace)

</div>
