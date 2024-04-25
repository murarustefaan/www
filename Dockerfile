FROM node:20.11.0-bullseye-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
COPY . /service
WORKDIR /service

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build

FROM nginx:1.26-alpine AS runtime
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /service/dist /usr/share/nginx/html
EXPOSE 8080
