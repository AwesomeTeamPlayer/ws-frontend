FROM node:7.0

ADD . /app
WORKDIR /app

RUN npm install
RUN npm install nodemon -g

CMD nodemon /app/src/app.js
EXPOSE 80
