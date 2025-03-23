FROM node:20-alpine as build
WORKDIR /app
COPY package.json /app/
COPY yarn.lock /app/
RUN yarn global add @ionic/cli@^7.2.0
RUN yarn install

COPY src/ /app/src
COPY public/ /app/public
COPY index.html /app/
COPY *.json /app/
COPY *.config.ts /app/
COPY *.config.js /app/

RUN ls && ionic build --prod

FROM nginx:alpine
COPY ./docker/nginx.conf /etc/nginx/templates/default.conf.template
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/ /usr/share/nginx/html/
