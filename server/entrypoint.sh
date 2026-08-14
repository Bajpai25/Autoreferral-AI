#!/bin/sh
# Apply Prisma migrations
npx prisma generate
npx prisma migrate deploy

# Build and start the server (for production)
# npm run build
# npm run start
exec "$@"
