FROM node:18-alpine
WORKDIR /app
COPY user-service/package*.json ./
RUN npm ci --only=production
COPY user-service/ .
EXPOSE 3002
CMD ["npm", "start"]
