FROM node:24-bullseye-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
WORKDIR /service

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.29.7-alpine AS runtime
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /service/dist /usr/share/nginx/html
EXPOSE 8080
