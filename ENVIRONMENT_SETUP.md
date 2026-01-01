# 🔧 GharBazaar - Environment Setup Guide

## 📋 **Environment Configuration Status**

### ✅ **Currently Configured:**
- **Firebase**: ✅ Complete setup with GharBazaar project
- **Razorpay**: ✅ Test keys configured
- **Basic Config**: ✅ Development environment ready

### ⚠️ **Needs Configuration:**
- **Google Maps API**: ❌ Required for property location features
- **Email Service**: ❌ Required for notifications
- **Production Keys**: ❌ Required for live deployment

---

## 🔑 **API Keys Setup Guide**

### **1. Google Maps API Key**

#### **Step 1: Get API Key**
```bash
1. Go to: https://console.developers.google.com/
2. Create new project or select existing
3. Enable APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials > API Key
5. Restrict key to your domain
```

#### **Step 2: Update Environment**
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC_your_actual_google_maps_key
```

### **2. Razorpay Payment Gateway**

#### **Current Status: ✅ Test Keys Configured**
```env
# Test Keys (Current)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RuGsetJSwC1LjN
RAZORPAY_KEY_SECRET=tOSo8fPBDHowHK82RArlxxe6
```

#### **For Production: Get Live Keys**
```bash
1. Go to: https://dashboard.razorpay.com/
2. Complete KYC verification
3. Get live keys from API Keys section
4. Update .env.production with live keys
```

### **3. Firebase Configuration**

#### **Current Status: ✅ Fully Configured**
```env
# GharBazaar Firebase Project (Active)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gharbazaar-d70e5
# All other Firebase keys are properly configured
```

#### **Firebase Services Enabled:**
- ✅ **Authentication** - Email, Google, Phone
- ✅ **Firestore Database** - Real-time database
- ✅ **Storage** - File uploads
- ✅ **Analytics** - User tracking
- ✅ **Hosting** - Web hosting (optional)

### **4. Email Service Setup**

#### **Gmail SMTP Configuration:**
```bash
1. Enable 2-Factor Authentication on Gmail
2. Generate App Password:
   - Google Account > Security > App passwords
   - Select "Mail" and generate password
3. Update environment variables
```

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=support@gharbazaar.in
SMTP_PASS=your-16-character-app-password
```

---

## 🌍 **Environment Files Structure**

### **Development (.env.local)**
```
✅ Currently Active
📍 Location: frontend/.env.local
🎯 Purpose: Local development
🔧 Status: Configured with test keys
```

### **Production (.env.production)**
```
✅ Created
📍 Location: frontend/.env.production
🎯 Purpose: Live deployment
⚠️ Status: Needs live keys update
```

### **Example Template (.env.example)**
```
✅ Updated
📍 Location: frontend/.env.example
🎯 Purpose: Template for new developers
📝 Status: Comprehensive template ready
```

---

## 🚀 **Quick Setup Commands**

### **For New Developers:**
```bash
# 1. Clone repository
git clone https://github.com/vishu-panwar/gharbazaar.in.git
cd gharbazaar.in/frontend

# 2. Copy environment template
cp .env.example .env.local

# 3. Update .env.local with actual keys
# (Firebase keys are already configured)

# 4. Install dependencies
npm install

# 5. Start development server
npm run dev
```

### **For Production Deployment:**
```bash
# 1. Update .env.production with live keys
# 2. Set environment variables in hosting platform
# 3. Deploy with production build
npm run build
```

---

## 🔐 **Security Best Practices**

### **Environment Variables Rules:**
```bash
✅ DO:
- Use NEXT_PUBLIC_ prefix for client-side variables
- Keep secret keys server-side only
- Use strong, unique secrets for production
- Rotate keys regularly

❌ DON'T:
- Commit .env.local to version control
- Expose secret keys in client code
- Use test keys in production
- Share keys in plain text
```

### **Key Security Levels:**
```
🟢 Public (NEXT_PUBLIC_): Safe for client-side
🟡 Server-only: Keep on server, never expose
🔴 Secret: Highly sensitive, encrypt if stored
```

---

## 📊 **Configuration Status Dashboard**

### **Firebase Services:**
```
Authentication:     ✅ Configured & Active
Firestore Database: ✅ Configured & Active
Storage:           ✅ Configured & Active
Analytics:         ✅ Configured & Active
Hosting:           ⚠️ Optional (not configured)
```

### **Payment Gateway:**
```
Razorpay Test:     ✅ Configured & Active
Razorpay Live:     ❌ Needs live keys for production
Payment Flow:      ✅ Implemented & Working
PDF Receipts:      ✅ Professional receipts ready
```

### **External APIs:**
```
Google Maps:       ❌ Needs API key
Email Service:     ❌ Needs SMTP configuration
Analytics:         ✅ Firebase Analytics ready
```

---

## 🎯 **Next Steps for Production**

### **Priority 1: Essential APIs**
1. **Get Google Maps API Key** (Required for property locations)
2. **Setup Email Service** (Required for notifications)
3. **Get Razorpay Live Keys** (Required for real payments)

### **Priority 2: Security**
1. **Generate Production Secrets** (JWT, NextAuth)
2. **Setup SSL Certificates** (HTTPS)<!--  -->
3. **Configure CORS** (API security)

### **Priority 3: Monitoring**
1. **Setup Error Tracking** (Sentry, LogRocket)
2. **Configure Performance Monitoring**
3. **Setup Uptime Monitoring**

---

## 📞 **Support & Resources**

### **Documentation Links:**
- **Firebase Console**: https://console.firebase.google.com/
- **Razorpay Dashboard**: https://dashboard.razorpay.com/
- **Google Cloud Console**: https://console.developers.google.com/
- **Vercel Environment Variables**: https://vercel.com/docs/environment-variables

### **Quick Help:**
```bash
# Check current environment
npm run env:check

# Validate Firebase connection
npm run firebase:test

# Test payment integration
npm run payment:test
```

---

**🎉 Your GharBazaar environment is 80% configured and ready for development!**

**Next: Get Google Maps API key to enable location features, then you're ready for production deployment!**