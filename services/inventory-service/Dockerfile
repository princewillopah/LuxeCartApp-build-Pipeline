FROM node:18-alpine
WORKDIR /app
COPY inventory-service/package*.json ./
RUN npm ci --only=production
COPY inventory-service/ .
COPY shared/ ./shared/
EXPOSE 3011
CMD ["npm", "start"]
