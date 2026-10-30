# Event Management System — single image for Jenkins + Kubernetes
# Layout in the repo must be:
#   backend/   (server.js, package.json, config/, routes/)
#   frontend/  (index.html, styles.css, app.js — served by backend/server.js)
#   database/  (schema.sql — used by MySQL init, not by this image)
# The backend serves the frontend, so one container serves the whole app
# on PORT (5000 inside the container).
FROM node:20-alpine

WORKDIR /app

# Install backend deps first (better layer caching).
# Only package.json is copied (not package-lock.json) so the build does
# not fail if the lock file was never committed to the Git repo.
COPY backend/package.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy app code (node_modules is excluded by .dockerignore)
COPY backend/ ./backend/
COPY frontend/ ./frontend/

ENV NODE_ENV=production
ENV PORT=5000
# DB_* are NOT baked in here. They are injected at runtime from a
# Kubernetes Secret / env vars (see k8s/app-deployment.yaml):
#   DB_HOST=mysql  DB_PORT=3306  DB_NAME=event_db
#   DB_USER / DB_PASSWORD come from the mysql-secret Secret.
# NOTE: 3306 is the in-cluster MySQL port. The 3307 in backend/.env.example
# is a Windows-local quirk from the original project — do NOT use it here.
EXPOSE 5000

WORKDIR /app/backend
CMD ["node", "server.js"]
