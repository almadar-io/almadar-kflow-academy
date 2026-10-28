# The std-kflow app: its own http server (std-http-server in the program) serving dist/client.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=secret,id=node_auth_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token)" pnpm install --ignore-workspace --frozen-lockfile
COPY scripts scripts
COPY static static
RUN --mount=type=secret,id=node_auth_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token)" pnpm build:app

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/dist dist
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node_modules/.bin/orb", "serve", "node_modules/@almadar-io/behaviors/behaviors/lolo/kflow/organisms/std-kflow.lolo", "--no-mock"]
