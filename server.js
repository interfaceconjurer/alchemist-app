const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 5001;
const app = express();

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https')
      res.redirect(`https://${req.header('host')}${req.url}`);
    else
      next();
  });
}

app.use(express.static(path.resolve(__dirname, './client/dist')));

app.get('/{*splat}', function (request, response) {
  response.sendFile(path.resolve(__dirname, './client/dist', 'index.html'));
});

app.listen(PORT, function () {
  console.log(`Server listening on port ${PORT}`);
});
