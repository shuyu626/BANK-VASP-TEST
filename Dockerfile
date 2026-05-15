# syntax=docker/dockerfile:1.6

# ===== Stage 1: build =====
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===== Stage 2: nitro runtime =====
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

# ===== Stage 3: nginx edge =====
# 把預渲染 HTML 與 _nuxt 靜態 chunk 烤進 nginx image，
# 由 nginx 直接吐靜態檔；SSR / CSR shell 才反向代理到 nitro container。
FROM nginx:1.27-alpine AS nginx
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/.output/public /var/www/nuxt
EXPOSE 80
