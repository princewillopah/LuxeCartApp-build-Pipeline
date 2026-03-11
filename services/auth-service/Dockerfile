FROM node:18-alpine
WORKDIR /app
COPY auth-service/package*.json ./
RUN npm ci --only=production
COPY auth-service/ .
COPY shared/ ./shared/
EXPOSE 3001
CMD ["npm", "start"]
