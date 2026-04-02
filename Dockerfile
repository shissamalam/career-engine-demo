# Using appliance-uprising-builder as base — it has Node 20 + npm
# Docker Hub is blocked on this host but npm registry is reachable from containers

FROM appliance-uprising-builder:latest AS builder
ENTRYPOINT []
WORKDIR /build
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM appliance-uprising-builder:latest AS runner
ENTRYPOINT []
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Copy standalone output
COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static
COPY --from=builder /build/public ./public

# Copy dna.txt (can be overridden via bind mount at runtime)
COPY dna.txt ./dna.txt

EXPOSE 3000
CMD ["node", "server.js"]
