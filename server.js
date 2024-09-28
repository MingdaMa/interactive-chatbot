const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const PORT = process.env.PORT || 3000;

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.post('/chat', (req, res) => { 
  const { userMsg } = req.body;
  res.json({ message: 'Message received!' });
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});