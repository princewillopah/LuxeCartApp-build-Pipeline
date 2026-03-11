FROM node:18-alpine
WORKDIR /app
COPY rating-service/package*.json ./
RUN npm ci --only=production
COPY rating-service/ .
EXPOSE 3007
CMD ["npm", "start"]
