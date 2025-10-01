FROM node:22-alpine AS build
WORKDIR /app
COPY package.json /app/
COPY yarn.lock /app/
RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn \
    yarn global add @ionic/cli@^7.2.0 \
    && yarn install --frozen-lockfile

COPY src/ /app/src
COPY public/ /app/public
COPY index.html /app/
COPY *.json /app/
COPY *.config.ts /app/
COPY *.config.js /app/
COPY .env.production /app/.env

RUN ionic build --prod

FROM nginx:stable-alpine3.21
COPY ./docker/env.sh /docker-entrypoint.d/env.sh
COPY ./docker/nginx.conf /etc/nginx/templates/default.conf.template
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/ /usr/share/nginx/html/

RUN chmod +x /docker-entrypoint.d/env.sh
CMD ["nginx", "-g", "daemon off;"]
