FROM node:26-alpine AS build

WORKDIR /app

COPY package*.json ./
# --ignore-scripts evita rodar lifecycle scripts arbitrários de qualquer dependência;
# o bcrypt precisa do próprio para compilar o binding nativo, então é rebuildado à parte.
RUN npm ci --ignore-scripts && npm rebuild bcrypt

COPY prisma ./prisma
RUN npx prisma@5.22.0 generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build


FROM node:26-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm rebuild bcrypt

COPY prisma ./prisma
RUN npx prisma@5.22.0 generate

COPY --from=build /app/dist ./dist

RUN chown -R node:node /app
USER node

EXPOSE 8000
CMD ["node", "dist/main.js"]
