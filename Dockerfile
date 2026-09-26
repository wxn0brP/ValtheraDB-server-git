FROM oven/bun:latest
RUN apt update && apt install -y git
WORKDIR /app

COPY package.json ./
RUN bun install

COPY src ./src

EXPOSE 14785
EXPOSE 14786

CMD ["bun", "run", "./src/index.ts"]
