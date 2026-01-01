# 📁 GharBazaar - Professional Project Structure

## 🏗️ **Clean Architecture Overview**

This document outlines the professional, production-ready structure of the GharBazaar platform.

## 📂 **Root Directory Structure**

```
gharbazaar-main/
├── 📄 README.md                    # Main project documentation
├── 📄 PROJECT_STRUCTURE.md         # This file - project organization
├── 🔒 .gitignore                   # Git ignore rules
├── ⚙️ vercel.json                  # Vercel deployment config
├── ⚙️ netlify.toml                 # Netlify deployment config (backup)
│
├── 📁 .git/                        # Git repository data
├── 📁 .github/                     # GitHub workflows and templates
│   ├── 📁 workflows/               # CI/CD automation
│   └── 📄 README.md                # GitHub-specific documentation
│
├── 📁 docs/                        # Project documentation
│   └── 📄 DATABASE_SCHEMA.sql      # Database structure
│
└── 📁 frontend/                    # Main Next.js application
    ├── 📁 .next/                   # Next.js build output (auto-generated)
    ├── 📁 node_modules/            # Dependencies (auto-generated)
    ├── 📁 public/                  # Static assets
    ├── 📁 src/                     # Source code
    ├── 📄 .env.example             # Environment variables template
    ├── 📄 .env.local               # Local environment (gitignored)
    ├── ⚙️ next.config.js           # Next.js configuration
    ├── ⚙️ tailwind.config.ts       # Tailwind CSS configuration
    ├── ⚙️ tsconfig.json            # TypeScript configuration
    ├── ⚙️ postcss.config.js        # PostCSS configuration
    ├── 📦 package.json             # Project dependencies
    └── ⚙️ vercel.json              # Vercel-specific config
```

## 🎯 **Frontend Application Structure**

### **📁 public/ - Static Assets**
```
public/
├── 📄 favicon.ico                  # Website favicon
├── 📄 README.md                    # Public assets documentation
└── 📁 images/                      # Image assets
    ├── 🖼️ gharbazaar logo.jpeg     # Official brand logo
    └── 🖼️ founder.jpg              # Founder profile image
```

### **📁 src/ - Source Code**
```
src/
├── 📄 middleware.ts                # Next.js middleware (auth, routing)
│
├── 📁 app/                         # Next.js App Router (pages)
│   ├── 📄 globals.css              # Global styles
│   ├── 📄 layout.tsx               # Root layout component
│   ├── 📄 loading.tsx              # Global loading component
│   ├── 📄 page.tsx                 # Homepage
│   │
│   ├── 📁 about/                   # About page
│   │   └── 📄 page.tsx
│   │
│   ├── 📁 contact/                 # Contact page
│   │   └── 📄 page.tsx
│   │
│   ├── 📁 founder/                 # Founder page
│   │   └── 📄 page.tsx
│   │
│   ├── 📁 pricing/                 # Pricing page
│   │   └── 📄 page.tsx
│   │
│   ├── 📁 login/                   # Authentication
│   │   └── 📄 page.tsx
│   │
│   ├── 📁 signup/                  # User registration
│   │   └── 📄 page.tsx
│   │
│   ├── 📁 listings/                # Property listings
│   │   ├── 📄 page.tsx             # Listings overview
│   │   └── 📁 [id]/                # Dynamic property pages
│   │       └── 📄 page.tsx
│   │
│   ├── 📁 dashboard/               # Client dashboard
│   │   ├── 📄 layout.tsx           # Dashboard layout
│   │   ├── 📄 page.tsx             # Dashboard home
│   │   ├── 📁 analytics/           # Analytics section
│   │   ├── 📁 bids/                # Bid management
│   │   ├── 📁 browse/              # Property browsing
│   │   ├── 📁 components/          # Dashboard-specific components
│   │   ├── 📁 contracts/           # Contract management
│   │   ├── 📁 earnings/            # Earnings tracking
│   │   ├── 📁 favorites/           # Saved properties
│   │   ├── 📁 inquiries/           # Customer inquiries
│   │   ├── 📁 listings/            # User's property listings
│   │   ├── 📁 messages/            # Messaging system
│   │   ├── 📁 profile/             # Profile management
│   │   └── 📁 settings/            # Account settings
│   │
│   ├── 📁 admin/                   # Admin portal
│   │   ├── 📄 layout.tsx           # Admin layout
│   │   ├── 📄 page.tsx             # Admin dashboard
│   │   ├── 📁 analytics/           # Business analytics
│   │   ├── 📁 employees/           # Employee management
│   │   ├── 📁 listings/            # Listing moderation
│   │   ├── 📁 login/               # Admin authentication
│   │   ├── 📁 payments/            # Payment management
│   │   ├── 📁 salary/              # Salary management
│   │   ├── 📁 subscriptions/       # Subscription management
│   │   ├── 📁 tools/               # Admin tools
│   │   └── 📁 users/               # User management
│   │
│   ├── 📁 employee/                # Employee portal
│   │   ├── 📄 layout.tsx           # Employee layout
│   │   ├── 📄 page.tsx             # Employee dashboard
│   │   ├── 📁 apply/               # Job applications
│   │   ├── 📁 issues/              # Issue reporting
│   │   ├── 📁 kyc/                 # KYC verification
│   │   ├── 📁 leads/               # Lead management
│   │   ├── 📁 login/               # Employee authentication
│   │   ├── 📁 support/             # Support system
│   │   └── 📁 verification/        # Document verification
│   │
│   └── 📁 payment/                 # Payment processing
│       ├── 📄 page.tsx             # Payment form
│       ├── 📁 success/             # Payment success
│       │   └── 📄 page.tsx
│       └── 📁 failed/              # Payment failure
│           └── 📄 page.tsx
│
├── 📁 components/                  # Reusable UI components
│   ├── 📄 ErrorBoundary.tsx       # Error handling component
│   ├── 📄 GlobalLoader.tsx        # Global loading system
│   ├── 📄 LoadingScreen.tsx       # App loading screen
│   ├── 📄 LoadingSpinner.tsx      # Simple spinner component
│   ├── 📄 ModeChangeToast.tsx     # Theme change notifications
│   ├── 📄 providers.tsx           # App providers wrapper
│   │
│   ├── 📁 home/                    # Homepage components
│   │   ├── 📄 FeaturedListings.tsx # Featured properties
│   │   ├── 📄 Hero.tsx             # Hero section
│   │   ├── 📄 HowItWorks.tsx       # Process explanation
│   │   ├── 📄 PricingPreview.tsx   # Pricing overview
│   │   ├── 📄 TrustStrip.tsx       # Trust indicators
│   │   ├── 📄 UserRoles.tsx        # Portal access buttons
│   │   └── 📄 WhyGharBazaar.tsx    # Value proposition
│   │
│   ├── 📁 layout/                  # Layout components
│   │   ├── 📄 Footer.tsx           # Site footer
│   │   ├── 📄 Header.tsx           # Site header
│   │   ├── 📄 LayoutWrapper.tsx    # Main layout wrapper
│   │   └── 📄 MobileNav.tsx        # Mobile navigation
│   │
│   ├── 📁 payment/                 # Payment components
│   │   └── 📄 PaymentForm.tsx      # Payment form component
│   │
│   └── 📁 ui/                      # Basic UI components
│       ├── 📄 Loader.tsx           # Loading component
│       └── 📄 QRCodeGenerator.tsx  # QR code generator
│
├── 📁 contexts/                    # React Context providers
│   └── 📄 AuthContext.tsx          # Authentication context
│
├── 📁 hooks/                       # Custom React hooks
│   └── 📄 usePageLoader.ts         # Page loading hook
│
└── 📁 lib/                         # Utility libraries
    ├── 📄 api.ts                   # API utilities
    ├── 📄 api.optimized.ts         # Optimized API calls
    ├── 📄 firebase.ts              # Firebase configuration
    ├── 📄 logger.ts                # Logging utilities
    ├── 📄 payment.ts               # Payment utilities
    ├── 📄 payment-api.ts           # Payment API integration
    ├── 📄 performance.ts           # Performance monitoring
    └── 📄 razorpay.ts              # Razorpay integration
```

## 🎯 **Key Architecture Principles**

### **1. Separation of Concerns**
- **Pages**: Route handling and page-level logic
- **Components**: Reusable UI elements
- **Contexts**: Global state management
- **Hooks**: Reusable stateful logic
- **Lib**: Utility functions and configurations

### **2. Feature-Based Organization**
- Each major feature has its own directory
- Related components are grouped together
- Shared utilities are centralized in `/lib`

### **3. Scalable Structure**
- Easy to add new pages and features
- Clear naming conventions
- Modular component architecture
- Type-safe with TypeScript

### **4. Performance Optimization**
- Code splitting by routes
- Lazy loading of components
- Optimized asset management
- Efficient state management

## 🔧 **Configuration Files**

### **Next.js Configuration**
- `next.config.js` - Next.js build and runtime configuration
- `middleware.ts` - Route protection and request handling

### **Styling Configuration**
- `tailwind.config.ts` - Tailwind CSS customization
- `postcss.config.js` - PostCSS plugins
- `globals.css` - Global styles and CSS variables

### **TypeScript Configuration**
- `tsconfig.json` - TypeScript compiler options
- Strict type checking enabled
- Path aliases for clean imports

### **Deployment Configuration**
- `vercel.json` - Vercel deployment settings
- `netlify.toml` - Netlify deployment (backup)
- Environment variable templates

## 📊 **File Naming Conventions**

### **Components**
- PascalCase: `ComponentName.tsx`
- Descriptive names: `PaymentSuccessPage.tsx`

### **Pages**
- lowercase: `page.tsx` (Next.js App Router)
- Dynamic routes: `[id]/page.tsx`

### **Utilities**
- kebab-case: `payment-api.ts`
- Descriptive names: `performance.ts`

### **Hooks**
- camelCase with 'use' prefix: `usePageLoader.ts`

## 🚀 **Development Workflow**

### **Adding New Features**
1. Create feature directory in appropriate section
2. Add page component in `/app`
3. Create reusable components in `/components`
4. Add utilities in `/lib` if needed
5. Update routing and navigation

### **Code Organization Best Practices**
- Keep components small and focused
- Use TypeScript for type safety
- Follow consistent naming conventions
- Document complex logic
- Write reusable utilities

## 📈 **Scalability Considerations**

### **Current Structure Supports**
- Multiple user roles (Client, Employee, Admin)
- Complex dashboard functionality
- Payment processing
- Real-time features
- Mobile responsiveness

### **Future Expansion Ready**
- Easy to add new user roles
- Modular component system
- Scalable state management
- Performance monitoring built-in

---

**This structure ensures maintainability, scalability, and professional development standards for the GharBazaar platform.**