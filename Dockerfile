FROM node:14.16.1

WORKDIR /app

COPY package.json ./

RUN npm install

RUN npm i -g @nestjs/cli

COPY . .

EXPOSE 5000

CMD [ "npm", "run", "start:dev" ]
