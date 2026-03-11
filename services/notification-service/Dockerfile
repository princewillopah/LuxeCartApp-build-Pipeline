FROM node:18-alpine
WORKDIR /app
COPY notification-service/package*.json ./
RUN npm ci --only=production
COPY notification-service/ .
COPY shared/ ./shared/
EXPOSE 3009
CMD ["npm", "start"]
