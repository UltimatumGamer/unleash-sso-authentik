ARG NODE_VERSION

FROM node:24-alpine AS builder

WORKDIR /unleash

COPY index.js package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production=true

FROM node:24-alpine

ENV NODE_ENV production

WORKDIR /unleash

COPY --from=builder /unleash /unleash

RUN rm -rf /usr/local/lib/node_modules/npm/

EXPOSE 4242

USER node

CMD node index.js
