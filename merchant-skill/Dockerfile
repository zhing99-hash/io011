# AICart Merchant Skill - Docker镜像
FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache git python3 make g++ sqlite curl

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN mkdir -p data config logs generated-site uploads

EXPOSE 3456
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD curl -f http://localhost:3456/health || exit 1

CMD ["node", "src/index.js"]

LABEL maintainer="AICart Team" version="0.1.0"