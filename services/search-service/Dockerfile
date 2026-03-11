FROM node:18-alpine
WORKDIR /app
COPY search-service/package*.json ./
RUN npm ci --only=production
COPY search-service/ .
COPY shared/ ./shared/
EXPOSE 3012
CMD ["npm", "start"]
