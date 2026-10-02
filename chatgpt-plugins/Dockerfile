FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs ./
COPY src ./src
COPY widgets ./widgets
COPY legal ./legal
EXPOSE 8787
CMD ["node", "server.mjs"]
