FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ===== Development stage =====
FROM base AS dev
RUN npm install                  # includes devDependencies (nodemon)
COPY src ./src
EXPOSE 3000
CMD ["node_modules/.bin/nodemon", "src/app.js"]

# ===== Production stage =====
FROM base AS prod
RUN npm install --production     # no devDependencies
COPY src ./src
EXPOSE 3000
CMD ["node", "src/app.js"]
