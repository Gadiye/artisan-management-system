# Use an official Node.js runtime as a parent image
FROM node:lts-alpine

# Set the working directory
WORKDIR /app/frontend

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install xlsx

# Copy the rest of your frontend application code
COPY . .

# Build the Next.js application for production
# If you are only doing dev builds, you might skip this for faster iteration,
# but it's good practice for deployable images.
# RUN npm run build

# Expose the port your Next.js application will run on (e.g., 3000)
EXPOSE 3000

# Command to run your Next.js application
CMD ["npm", "run", "dev"]
