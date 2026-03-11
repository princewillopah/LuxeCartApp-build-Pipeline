FROM node:18-alpine
WORKDIR /app
COPY admin-service/package*.json ./
RUN npm ci --only=production
COPY admin-service/ .
EXPOSE 3010
CMD ["npm", "start"]
