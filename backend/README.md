# 🚀 GharBazaar Socket.IO Backend

Complete real-time backend for GharBazaar featuring Socket.IO chat, support ticketing, and REST API endpoints.

## ✨ Features

### Real-time Chat (Buyer-Seller)
- ✅ Instant messaging
- ✅ Typing indicators  
- ✅ Read receipts (✓✓)
- ✅ Message editing
- ✅ Message deletion
- ✅ File uploads
- ✅ Conversation management

### Support Ticketing (Employee-Customer)
- ✅ Ticket creation
- ✅ Auto-assignment to employees
- ✅ Real-time ticket updates
- ✅ Employee broadcast room
- ✅ Status tracking (open → assigned → in progress → closed)
- ✅ Message history

### Security & Performance
- ✅ JWT authentication for Socket.IO & REST API
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Helmet security headers
- ✅ MongoDB with indexes
- ✅ Graceful shutdown

---

## 📦 Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key_here
MONGODB_URI=mongodb://localhost:27017/gharbazaar
FRONTEND_URL=http://localhost:3000
```

⚠️ **IMPORTANT**: Change `JWT_SECRET` to a strong random string in production!

### 3. Start MongoDB

Make sure MongoDB is running:

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with your Atlas connection string
```

### 4. Run the Server

**Development** (with auto-reload):
```bash
npm run dev
```

**Production**:
```bash
npm run build
npm start
```

---

## 🔌 API Endpoints

### REST API (AJAX)

**Chat Endpoints:**
```
GET    /api/v1/chat/conversations          - Get all conversations
POST   /api/v1/chat/conversations          - Create conversation
GET    /api/v1/chat/conversations/:id/messages - Get messages
POST   /api/v1/chat/conversations/:id/messages - Send message
```

**Ticket Endpoints:**
```
GET    /api/v1/tickets                     - Get user's tickets
GET    /api/v1/tickets/employee/all        - Get all tickets (employee)
GET    /api/v1/tickets/:id                 - Get ticket details
POST   /api/v1/tickets                     - Create ticket
POST   /api/v1/tickets/:id/assign          - Assign ticket
POST   /api/v1/tickets/:id/messages        - Send ticket message
PUT    /api/v1/tickets/:id/close           - Close ticket
```

**💡 All endpoints require Authorization header:**
```
Authorization: Bearer <jwt_token>
```

### Socket.IO Events

**Chat Events:**

Client → Server:
- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation  
- `send_message` - Send a chat message
- `typing` - Indicate typing status
- `mark_as_read` - Mark messages as read
- `edit_message` - Edit a message
- `delete_message` - Delete a message

Server → Client:
- `new_message` - New message received
- `user_typing` - User is typing
- `messages_read` - Messages marked as read
- `message_edited` - Message was edited
- `message_deleted` - Message was deleted

**Ticket Events:**

Client → Server:
- `join_employee_room` - Join employee broadcast (employees only)
- `join_ticket` - Join specific ticket room
- `leave_ticket` - Leave ticket room
- `ticket_message` - Send ticket message
- `assign_ticket` - Assign ticket to self (employees)
- `close_ticket` - Close a ticket (employees)

Server → Client:
- `ticket:created` - New ticket created
- `ticket:assigned` - Ticket assigned to employee
- `ticket:customer-message` - Customer sent message
- `ticket:status-changed` - Ticket status updated
- `ticket:closed` - Ticket was closed

---

## 🔐 Authentication

### JWT Token Flow

1. **Frontend Login** → Your auth backend returns JWT token
2. **Frontend stores token** in `localStorage.getItem('auth_token')`
3. **Socket.IO Connection**:
   ```javascript
   const token = localStorage.getItem('auth_token');
   const socket = io('http://localhost:5000', {
     auth: { token }
   });
   ```
4. **Backend verifies token** and attaches user data to socket
5. **REST API calls** include token in headers:
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`
   }
   ```

### Token Format

Your JWT token should contain:
```json
{
  "userId": "user_123",
  "email": "user@example.com",
  "role": "buyer" | "seller" | "employee"
}
```

---

## 💾 Database Schema

### Collections

**conversations**
- participants: [userId1, userId2]
- propertyId: string
- propertyTitle: string
- lastMessage: string
- lastMessageAt: Date

**messages**
- conversationId: ObjectId
- senderId: string
- senderEmail: string
- content: string
- type: 'text' | 'image' | 'file'
- read: boolean
- edited: boolean
- deleted: boolean

**tickets**
- userId: string
- userRole: 'buyer' | 'seller'
- categoryTitle: string
- subCategoryTitle: string
- problem: string
- status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed'
- assignedTo: string
- assignedToName: string

**ticketmessages**
- ticketId: ObjectId
- senderId: string
- senderType: 'customer' | 'employee'
- message: string
- timestamp: Date

---

## 🧪 Testing

### Test Socket.IO Connection

```javascript
// Frontend test code
const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('auth_token')
  }
});

socket.on('connect', () => {
  console.log('✅ Connected!');
});

socket.on('error', (error) => {
  console.error('❌ Error:', error);
});
```

### Test REST API

```bash
# Health check
curl http://localhost:5000/api/v1/health

# Get conversations (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/v1/chat/conversations
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── socket/
│   │   ├── index.ts              # Socket.IO server
│   │   ├── auth.middleware.ts    # Socket authentication
│   │   └── handlers/
│   │       ├── chat.handler.ts   # Chat events
│   │       └── ticket.handler.ts # Ticket events
│   ├── controllers/
│   │   ├── chat.controller.ts    # Chat REST API
│   │   └── ticket.controller.ts  # Ticket REST API
│   ├── models/
│   │   ├── conversation.model.ts
│   │   ├── message.model.ts
│   │   ├── ticket.model.ts
│   │   └── ticketMessage.model.ts
│   ├── middleware/
│   │   └── auth.middleware.ts    # REST API authentication
│   ├── routes/
│   │   ├── chat.routes.ts
│   │   ├── ticket.routes.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── jwt.ts                # JWT utilities
│   │   └── database.ts           # MongoDB connection
│   ├── config/
│   │   └── index.ts              # Configuration
│   └── server.ts                 # Main server file
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 🚀 Deployment

### Environment Variables (Production)

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=<strong_random_secret>
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gharbazaar
FRONTEND_URL=https://your-frontend.com
```

### Deploy to Heroku

```bash
heroku create gharbazaar-socket-backend
heroku addons:create mongolab
heroku config:set JWT_SECRET=your_secret
heroku config:set FRONTEND_URL=https://your-frontend.com
git push heroku main
```

### Deploy to Railway/Render

1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy!

---

## 📊 Monitoring

### Check Server Status

```bash
# Health check
GET /api/v1/health

# Response:
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "2026-01-10T12:00:00.000Z"
}
```

### Socket.IO Stats (Internal)

The server logs connection/disconnection events to console.

---

## 🐛 Troubleshooting

### Socket won't connect

1. Check CORS settings in `.env` - `FRONTEND_URL` must match your frontend
2. Verify JWT token is being sent: `{ auth: { token } }`
3. Check console for authentication errors
4. Ensure MongoDB is running

### REST API returns 401

1. Token must be in header: `Authorization: Bearer <token>`
2. Token must be valid (not expired)
3. Check JWT_SECRET matches between auth service and this backend

### Database connection failed

1. Ensure MongoDB is running: `mongod`
2. Check `MONGODB_URI` in `.env`
3. For Atlas, whitelist your IP address

---

## 👔 Development Team

Built with ❤️ by the GharBazaar Backend Team

---

**🎉 Your Socket.IO backend is ready! Connect your frontend and enjoy real-time features!**
