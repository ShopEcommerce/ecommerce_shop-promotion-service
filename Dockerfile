FROM node:20-alpine AS builder

WORKDIR /app

COPY shared/teleshop-common-1.0.0.tgz ./shared/
COPY shared/teleshop-common-1.0.3.tgz ./shared/
COPY promotion-service/package*.json ./promotion-service/

WORKDIR /app/promotion-service
RUN npm ci

COPY promotion-service/ ./
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner

WORKDIR /app/promotion-service
ENV NODE_ENV=production

COPY --from=builder /app/promotion-service /app/promotion-service

EXPOSE 3008
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
