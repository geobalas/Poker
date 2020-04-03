# Poker

A poker application running on node.js with socket.io, using angularJS on the front-end for data binding.

View a demo of the work in progress [here](http://dev.tableflippoker.com/)

## To use with Docker

```docker build -t geobalas/poker .```
```docker run -p 49160:3000 -d geobalas/poker```

To test it out, open up two or more browser tabs and aim them at http://localhost:49160/