FROM node:18-alpine
WORKDIR /app
COPY order-service/package*.json ./
RUN npm ci --only=production
COPY order-service/ .
COPY shared/ ./shared/
EXPOSE 3005
CMD ["npm", "start"]
