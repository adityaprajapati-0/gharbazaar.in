# 🏠 GharBazaar - India's Most Transparent Property Platform

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-10.0-orange)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com/)

> **Revolutionizing Real Estate in India** - No brokers, no hidden fees, complete transparency.

---

## 🎯 **Project Overview**

GharBazaar is a modern, transparent property platform that connects buyers, sellers, and renters directly. Built with cutting-edge technology and optimized for performance, it offers a seamless experience across all devices.

### **🌟 Key Features**

- **🚫 Zero Broker Interference** - Direct property transactions
- **💰 Transparent Pricing** - ₹1000 one-time listing fee
- **🔒 Bank-Level Security** - Firebase authentication & encryption
- **📱 Fully Responsive** - Mobile-first design approach
- **⚡ Lightning Fast** - Optimized for Core Web Vitals
- **🎨 Modern UI/UX** - Professional startup-grade design

---

## 🛠 **Tech Stack**

### **Frontend**
```
Next.js 14        → React framework with App Router
TypeScript        → Type-safe development
Tailwind CSS      → Utility-first styling
Lucide React      → Beautiful icons
Premium Loader    → Brand-centric loading system
```

### **Backend & Services**
```
Firebase Auth     → Authentication (Email, Google, Phone)
Firestore         → NoSQL database
Firebase Storage  → File storage
Vercel            → Deployment & hosting
```

### **Performance**
```
Image Optimization → Next.js automatic optimization
Code Splitting     → Route-based & dynamic imports
Caching Strategy   → Memory + localStorage + CDN
Bundle Analysis    → Optimized for minimal size
```

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- npm 9+
- Firebase project

### **Installation**

1. **Clone & Install**
```bash
git clone https://github.com/vishu-panwar/gharbazaar.in.git
cd gharbazaar-main/frontend
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env.local
```

Add your Firebase credentials to `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

3. **Run Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📁 **Project Structure**

```
gharbazaar-main/
├── 📄 DEVELOPER_GUIDE.md          # Comprehensive dev guide
├── 📄 COMPONENT_LIBRARY.md        # UI component documentation
├── 📄 README.md                   # This file
│
└── frontend/
    ├── 📁 public/
    │   └── 📁 images/
    │       ├── 🖼️ gharbazaar logo.jpeg
    │       └── 🖼️ founder.jpg
    │
    ├── 📁 src/
    │   ├── 📁 app/                 # Next.js App Router
    │   │   ├── 🔐 login/           # Authentication
    │   │   ├── 🔐 signup/
    │   │   ├── 🏠 dashboard/       # User dashboard
    │   │   ├── 📄 about/           # Marketing pages
    │   │   ├── 📄 contact/
    │   │   ├── 📄 founder/
    │   │   ├── 📄 pricing/
    │   │   └── 🏡 page.tsx         # Landing page
    │   │
    │   ├── 📁 components/          # Reusable UI components
    │   │   ├── 📁 layout/
    │   │   │   ├── Header.tsx
    │   │   │   └── Footer.tsx
    │   │   ├── 📁 ui/
    │   │   │   └── Loader.tsx      # Premium loading component
    │   │   ├── GlobalLoader.tsx    # Global loader context
    │   │   └── LoadingScreen.tsx   # App loading screen
    │   │
    │   ├── 📁 contexts/            # React Context
    │   │   └── AuthContext.tsx
    │   │
    │   └── 📁 lib/                 # Utilities
    │       ├── firebase.ts         # Firebase config
    │       └── performance.ts      # Performance utilities
    │
    ├── ⚙️ next.config.js           # Next.js configuration
    ├── 🎨 tailwind.config.ts       # Tailwind configuration
    └── 📦 package.json             # Dependencies
```

---

## 🎨 **Design System**

### **Color Palette**
```css
Primary:   Teal (#14b8a6) → Emerald (#10b981) → Blue (#2563eb)
Neutral:   Gray scale from 50 to 900
Success:   Green (#10b981)
Error:     Red (#ef4444)
Warning:   Yellow (#f59e0b)
```

### **Typography**
```css
Font Family: Inter, system-ui, sans-serif
Sizes:       xs(12px) → sm(14px) → base(16px) → lg(18px) → xl(20px) → 2xl(24px)
Weights:     light(300) → normal(400) → medium(500) → semibold(600) → bold(700)
```

### **Premium Loader System**
```typescript
// Brand-centric loading experience
✅ Full-screen overlay with gradient background
✅ GharBazaar logo with glow effects
✅ Circular progress ring with smooth animation
✅ Floating dots with staggered bounce
✅ Trust indicators (Secure, Trusted, Transparent)
✅ Smooth fade transitions (enter/exit)
✅ Responsive design for all devices
✅ Accessibility support (reduced motion)

// Usage
import { useLoader } from '@/components/GlobalLoader'
const { showLoader } = useLoader()
showLoader('Building trust, one home at a time', 2000)
```

### **Responsive Breakpoints**
```css
sm:  640px   (Small tablets)
md:  768px   (Tablets)
lg:  1024px  (Laptops)
xl:  1280px  (Desktops)
2xl: 1536px  (Large screens)
```

---

## ⚡ **Performance Optimizations**

### **Core Web Vitals**
- **LCP**: < 2.5s (Largest Contentful Paint)
- **FID**: < 100ms (First Input Delay)  
- **CLS**: < 0.1 (Cumulative Layout Shift)

### **Optimization Techniques**
```typescript
✅ Image Optimization     → WebP/AVIF formats, lazy loading
✅ Code Splitting         → Route-based + dynamic imports
✅ Caching Strategy       → Memory + localStorage + CDN
✅ Bundle Optimization    → Tree shaking, minification
✅ Authentication Cache   → Instant auth state with localStorage
✅ Database Optimization  → Firestore offline persistence
```

### **Performance Monitoring**
```typescript
// Built-in performance utilities
import { performanceMonitor } from '@/lib/performance'

// Track component render time
performanceMonitor.measureRender('ComponentName', renderFunction)

// Track API call performance
const data = await performanceMonitor.measureAPI('getUserData', apiCall)

// Monitor Core Web Vitals
performanceMonitor.trackWebVitals()
```

---

## 🔐 **Security Features**

### **Authentication**
- Firebase Auth with email/password
- Google OAuth integration
- Phone number verification
- Secure session management
- Role-based access control

### **Data Protection**
- HTTPS everywhere
- Input validation & sanitization
- XSS protection
- CSRF protection
- Secure headers configuration

### **Privacy**
- No data sharing with brokers
- GDPR compliant
- Transparent data usage
- User control over data

---

## 🏗 **Architecture**

### **Authentication Flow**
```
User Login → Firebase Auth → Cache User Data → Update UI State
     ↓              ↓              ↓              ↓
  Form Input → Verify Credentials → localStorage → Context API
```

### **Data Flow**
```
Component → Context API → Firebase SDK → Firestore → Real-time Updates
    ↓           ↓            ↓            ↓            ↓
  UI State → Global State → Network → Database → Live Sync
```

### **Route Protection**
```typescript
// middleware.ts
Protected Routes → Check Auth State → Redirect if Unauthorized
      ↓                 ↓                    ↓
  /dashboard/*    → localStorage    → /login (if not authenticated)
```

---

## 📊 **Key Metrics**

### **Performance Benchmarks**
- **Page Load Time**: < 2 seconds
- **Time to Interactive**: < 3 seconds
- **Bundle Size**: < 500KB (gzipped)
- **Lighthouse Score**: 95+ (Performance)

### **User Experience**
- **Mobile-First**: 100% responsive design
- **Accessibility**: WCAG 2.1 AA compliant
- **Cross-Browser**: Chrome, Firefox, Safari, Edge
- **Offline Support**: Basic functionality works offline

---

## 🚀 **Deployment**

### **Production Build**
```bash
npm run build
npm start
```

### **Vercel Deployment**
```bash
# Automatic deployment on push to main branch
git push origin main
```

### **Environment Variables**
```env
# Required for production
NEXT_PUBLIC_FIREBASE_API_KEY=prod_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=prod_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=prod_project_id
# ... other Firebase config
```

---

## 🧪 **Development**

### **Code Quality**
```bash
npm run lint          # ESLint check
npm run type-check    # TypeScript check
npm run format        # Prettier format
```

### **Git Workflow**
```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create pull request → Review → Merge
```

### **Commit Convention**
```
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Code formatting
refactor: Code refactoring
perf:     Performance improvement
test:     Tests
chore:    Build/config changes
```

---

## 📚 **Documentation**

- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Comprehensive development guide
- **[Component Library](./COMPONENT_LIBRARY.md)** - UI component documentation
- **[API Documentation](./docs/API.md)** - Backend API reference
- **[Database Schema](./docs/DATABASE_SCHEMA.sql)** - Database structure

---

## 🤝 **Contributing**

We welcome contributions! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### **Development Setup**
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## 📞 **Support & Contact**

- **🌐 Website**: [gharbazaar.in](https://gharbazaar.in)
- **📧 Email**: support@gharbazaar.in
- **👨‍💼 Founder**: Vishu Panwar
- **🐙 GitHub**: [github.com/vishu-panwar/gharbazaar.in](https://github.com/vishu-panwar/gharbazaar.in)

---

## 📄 **License**

This project is proprietary and confidential. All rights reserved.

---

## 🙏 **Acknowledgments**

- **Next.js Team** - Amazing React framework
- **Vercel** - Seamless deployment platform
- **Firebase** - Reliable backend services
- **Tailwind CSS** - Beautiful utility-first CSS
- **Lucide** - Clean and consistent icons

---

<div align="center">

**Made with ❤️ in India**

**GharBazaar - Transparent Property Deals**

[🏠 Visit Website](https://gharbazaar.in) • [📖 Documentation](./DEVELOPER_GUIDE.md) • [🐛 Report Bug](https://github.com/vishu-panwar/gharbazaar.in/issues)

</div>