FROM node:18-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy backend and frontend code
COPY backend ./backend
COPY frontend ./frontend

# Set working directory for server
WORKDIR /app/backend

EXPOSE 3000
CMD ["node", "server.js"]
