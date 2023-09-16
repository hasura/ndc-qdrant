# Name this stage 'build'
FROM node:16 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:16

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

# Copy from the 'build' stage
COPY --from=build /app/dist ./dist
