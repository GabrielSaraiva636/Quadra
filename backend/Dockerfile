FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN npm ci --prefix backend --omit=dev

COPY backend ./backend
COPY frontend ./frontend
COPY database ./database

EXPOSE 3000

CMD ["npm", "--prefix", "backend", "start"]
