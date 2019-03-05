const express = require('express');
const path = require('path');

const app = express()

if(process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https')
      res.redirect(`https://${req.header('host')}${req.url}`)
    else
      next()
  })
}

// Priority serve any static files.
app.use(express.static(path.resolve(__dirname, './client/build')));
