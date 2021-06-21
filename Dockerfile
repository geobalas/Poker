FROM node:12.18.1

WORKDIR /app


COPY . .
EXPOSE 3000

CMD echo "yes, poker win!"
CMD node app