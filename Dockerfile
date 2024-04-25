FROM node:20.12.2-bullseye-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
COPY . /service
WORKDIR /service

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
RUN pnpm build

FROM nginx:1.26.0-alpine AS runtime
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /service/dist /usr/share/nginx/html
EXPOSE 8080
