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

# Set the NODE_ENV to production
ENV NODE_ENV production

# Expose the port the app runs on
EXPOSE 8101

# Command to run the application
CMD ["node", "dist/index.js"]
