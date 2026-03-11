FROM node:18-alpine
WORKDIR /app
COPY payment-service/package*.json ./
RUN npm ci --only=production
COPY payment-service/ .
COPY shared/ ./shared/
EXPOSE 3008
CMD ["npm", "start"]
