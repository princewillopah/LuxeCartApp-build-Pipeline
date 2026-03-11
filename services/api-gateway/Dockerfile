FROM node:18-alpine
WORKDIR /app
COPY api-gateway/package*.json ./
RUN npm ci --only=production
COPY api-gateway/ .
EXPOSE 3000
CMD ["npm", "start"]
