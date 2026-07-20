# Build stage — compile the Vite bundle with env vars baked in
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifest first for better layer caching
COPY package.json ./
RUN npm install --no-audit --no-fund

# Now copy the rest and build
COPY . .

# Railway/Docker build args → env vars available to Vite at build time.
# Vite bakes anything prefixed VITE_ into the bundle during `npm run build`.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# Serve stage — small image that just serves dist/
FROM node:20-alpine AS serve
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/vite.config.js ./
# Install only the runtime piece needed for `vite preview`
RUN npm install --omit=dev --no-audit --no-fund vite

EXPOSE 4173
# Railway injects PORT; vite.config.js binds to it.
CMD ["npx", "vite", "preview", "--host", "0.0.0.0"]
