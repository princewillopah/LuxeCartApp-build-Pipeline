FROM node:18-alpine
WORKDIR /app
COPY review-service/package*.json ./
RUN npm ci --only=production
COPY review-service/ .
EXPOSE 3006
CMD ["npm", "start"]
