# 1. use proper nodejs alpine version 
# 2. Now go to the root directory of the project. set the workdirectory
# 3. Now copy the package.json file too
# 4. Now do npm ci
# 5. then copy the rest of the  project copy ..
# 6. then create the prisma instance npx prisma generate 
# 7. then create the npm run build
# 8. Expose the port 8000
# 9. cmd run the dist/server.js file

FROM mcr.microsoft.com/playwright:v1.49.0-jammy

#  // nodejs base image cause my runtime is nodeJS

WORKDIR /app
# entry point of the working repository

COPY package*.json ./

# copy the entire package.json

RUN npm  i
# run the package.lock.json version dependencies only

# # Install certificates for HTTPS and dependencies for Playwright
# RUN apk add --no-cache ca-certificates \
#     nss \
#     freetype \
#     harfbuzz \
#     ca-certificates \
#     ttf-freefont \
#     chromium


COPY . .
# copy the whole code
RUN chmod +x entrypoint.sh
ENV PORT=8000
EXPOSE 8000

ENTRYPOINT  [ "./entrypoint.sh" ]
CMD [ "npm" , "run" , "start" ]



