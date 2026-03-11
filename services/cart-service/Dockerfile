FROM node:18-alpine
WORKDIR /app
COPY cart-service/package*.json ./
RUN npm ci --only=production
COPY cart-service/ .
EXPOSE 3004
CMD ["npm", "start"]
