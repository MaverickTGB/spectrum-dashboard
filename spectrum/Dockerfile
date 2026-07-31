# Build stage — compile the Vite bundle with env vars baked in
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Railway service variables → build ARGs → env vars → baked into bundle by Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# Serve stage — tiny image, static server with SPA fallback
FROM node:20-alpine AS serve
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist

EXPOSE 3000
# -s = single-page app mode: unknown routes fall back to index.html
#      (this is what makes /login, /admin, etc. work with react-router)
CMD ["sh", "-c", "serve dist -l ${PORT:-3000}"]
