FROM node:18-alpine

WORKDIR /app

# copy dependency manifests
COPY services/image-service/package*.json ./

# install dependencies
RUN npm ci --omit=dev

# copy service source
COPY services/image-service/ ./

EXPOSE 3011

CMD ["npm", "start"]
