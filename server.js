require('dotenv').config();
const {OpenAI} = require('openai');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const axios = require('axios');

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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.use('/dist', express.static(path.join(__dirname, 'dist')));

app.post('/chat', async (req, res) => { 
  const { history = [], input: userInput, participantID } = req.body; // Default history

  // Check for participantID
  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }

  console.log('userInput:', userInput);
 
  const messages = history.length === 0  
    ? [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: userInput }] 
    : [{ role: 'system', content: 'You are a helpful assistant.' }, ...history, { role: 'user', content: userInput }];

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages, // pass messages instead of user input only
        max_tokens: 1500,
      });

      console.log('response:', response);

      const botResponse = response.choices[0].message.content.trim();

      const interaction = new Interaction({
        userInput,
        botResponse,
        participantID
      }); 

      await interaction.save();
      res.json({ message: botResponse});

    } catch (e) {
      console.error('Error:', e.message);
    }
})

app.post('/log-event', async (req, res) => {
  const { eventType, elementName, timestamp, participantID } = req.body;

  // Check for participantID
  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }

  try {
      const event = new EventLog({ eventType, elementName, participantID, timestamp }); 
      await event.save();
      res.status(200).send('Event logged successfully');
    } catch (error) {
      console.error('Error logging event:', error.message);
      res.status(500).send('Server Error');
    }
});

// Define a POST route for retrieving chat history by participantID
// POST route to fetch conversation history by participantID
app.post('/history', async (req, res) => {
  const { participantID } = req.body; // Get participant ID
  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }
  try {
    // Fetch all interactions from the database for the given participantID
    const interactions = await Interaction.find({ participantID }).sort({ timestamp: 1 });
    // Send the conversation history back to the client
    res.json({ interactions });
  } catch (error) {
    console.error('Error fetching conversation history:', error.message);
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});