# UniLife-Hub

SLIIT Students' Accommodation, Food & Transport Management System

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB connection string
- npm or yarn

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd UniLife-Hub
   ```

2. **Setup Backend**
   ```bash
   cd server
   npm install
   # Create .env file with your MongoDB connection
   npm start
   ```
   Backend runs at: `http://localhost:8070`

3. **Setup Frontend** (in a new terminal)
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Frontend runs at: `http://localhost:5173`

4. **Access the Application**
   - Open browser to: `http://localhost:5173`
   - NOT `http://localhost:8070` (that's the API)

## ⚠️ Troubleshooting

**White Screen Issue?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed help.

**Quick Diagnostic:**
- Windows: Run `check-system.bat`
- Check browser console (F12) for errors
- Verify both servers are running
- Make sure you're visiting `http://localhost:5173`

### Common Issues

1. **"Failed to fetch" errors**
   - Make sure backend is running (`npm start` in server directory)
   
2. **White screen, no errors**
   - Clear browser cache (Ctrl+Shift+R)
   - Check browser console (F12)
   
3. **"Cannot GET /"**
   - Visit the correct URL: `http://localhost:5173`

## 📁 Project Structure

```
UniLife-Hub/
├── client/          # React frontend (Vite + TailwindCSS)
│   ├── src/
│   │   ├── api/     # API client functions
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── App.jsx
│   └── package.json
├── server/          # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   └── middleware/
│   └── package.json
└── README.md
```

## 🔧 Environment Variables

**client/.env:**
```env
VITE_API_BASE_URL=http://localhost:8070/api
VITE_SOCKET_URL=http://localhost:8070
```

**server/.env:**
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=8070
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

## 🎯 Features

- Student accommodation management
- Food ordering system
- Transport booking
- Real-time chat
- Payment tracking
- Role-based dashboards (Student, Landlord, Vendor, Admin)

## 🛠️ Tech Stack

**Frontend:**
- React 19
- Vite
- TailwindCSS
- React Router
- Axios
- Socket.io Client

**Backend:**
- Node.js
- Express
- MongoDB + Mongoose
- Socket.io
- JWT Authentication

## 📝 Development

```bash
# Frontend development
cd client
npm run dev

# Backend development
cd server
npm run dev  # if you have nodemon setup
# or
npm start

# Linting (frontend)
cd client
npm run lint
```

## 🐛 Getting Help

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Run diagnostic: `check-system.bat` (Windows)
3. Check browser console (F12)
4. Verify environment variables

## 📄 License

[Add your license here]

