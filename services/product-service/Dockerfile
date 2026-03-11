FROM node:18-alpine
WORKDIR /app
COPY product-service/package*.json ./
RUN npm ci --only=production
COPY product-service/ .
EXPOSE 3003
CMD ["npm", "start"]
