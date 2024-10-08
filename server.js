require('dotenv').config();
const {OpenAI} = require('openai');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const Interaction = require('./models/Interaction');
const EventLog = require('./models/EventLog');

const PORT = process.env.PORT || 3000;

const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error(`MongoDB connection error: ${err}`));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.post('/chat', async (req, res) => { 
  const input = req.body;
  const message = input.userMsg;

  if (!message) {
    return res.status(400).send("Invalid Input");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: 'user', content: message}],
    max_tokens: 200,
    });
  const botResponse = response.choices[0].message.content.trim();
  
  const interaction = new Interaction({
    userInput: message,
    botResponse: botResponse,
    }); 

  await interaction.save();
  res.json({ message: botResponse });
})

app.post('/log-event', async (req, res) => {
  const { eventType, elementName, timestamp } = req.body;
  try {
      const event = new EventLog({ eventType, elementName, timestamp}); 
      await event.save();
      res.status(200).send('Event logged successfully');
    } catch (error) {
      console.error('Error logging event:', error.message);
      res.status(500).send('Server Error');
    }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});