# Use the official Node.js image as a base image
FROM node:16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install npm packages
RUN npm install

# Install global packages needed
RUN npm install -g ts-node typescript

# Copy the rest of the project files to the working directory
COPY . .

# Expose the port that the app runs on
EXPOSE 8101

# Specify the command to start the server
CMD [ "npm", "start" ]