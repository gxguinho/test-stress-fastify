FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock tsconfig.json ./

RUN yarn install --frozen-lockfile

COPY src ./src
RUN yarn build

FROM node:20-alpine
WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile

ENV NODE_ENV=production
ENV UV_THREADPOOL_SIZE=4
ENV NODE_OPTIONS="--max-old-space-size=512"

COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 8081

CMD ["yarn", "start:server"]
