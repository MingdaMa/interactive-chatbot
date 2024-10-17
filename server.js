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
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.post('/chat', async (req, res) => { 
  const { history = [], input: userInput } = req.body; // Default history

  const messages = history.length === 0  
    ? [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: userInput }] 
    : [{ role: 'system', content: 'You are a helpful assistant.' }, ...history, { role: 'user', content: userInput }];

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages, // pass messages instead of user input only
        max_tokens: 1500,
      });

      const bingResponse = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
        params: { q: userInput }, // Use the user's input as the search query
        headers: {
        'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY
        }
      });

      const searchResults = bingResponse.data.webPages.value.slice(0, 3).map(result => ({
        title: result.name,
        url: result.url,
        snippet: result.snippet
      }));
      console.log()

      const botResponse = response.choices[0].message.content.trim();

      const interaction = new Interaction({
        userInput,
        botResponse,
        searchResults
      }); 

      await interaction.save();
      res.json({ message: botResponse, searchResults: searchResults });

    } catch (e) {
      console.error('Error:', e.message);
    }
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