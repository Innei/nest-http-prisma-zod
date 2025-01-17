FROM node:20.18.1-alpine as builder
WORKDIR /app
COPY . .
RUN apk add git make g++ alpine-sdk python3 py3-pip unzip
RUN npm i -g pnpm
RUN pnpm install
RUN npm run build

FROM node:20.18.1-alpine
RUN apk add zip unzip bash --no-cache
RUN npm i -g pnpm
WORKDIR /app
COPY --from=builder /app/apps/core/dist apps/core/dist

ENV NODE_ENV=production
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY apps ./apps/
COPY .npmrc ./
COPY --from=builder /app/prisma ./prisma/
COPY external ./external/

RUN pnpm install --prod

COPY docker-clean.sh ./
RUN sh docker-clean.sh

ENV TZ=Asia/Shanghai
EXPOSE 3333

CMD ["pnpm", "-C apps/core run start:prod"]
