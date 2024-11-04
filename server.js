require('dotenv').config();
const {OpenAI} = require('openai');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const axios = require('axios');

const Interaction = require('./models/Interaction');
const EventLog = require('./models/EventLog');
const ProjectInfo = require('./models/ProjectInfo');

const PORT = process.env.PORT || 3000;

const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const systemPrompt = `You are a helpful assistant that helps developers create a ReadMe for their projects. Given information about a project,  you should be able to generate a markdown ReadMe file for the project. The user will provide you with information such as programming languages, frameworks, project description, or configuration files such as package.json, requirements.txt, Makefile, etc. You should take all of this information and generate markdown content that can be used as a ReadMe file for the project. Whenever you create a markdown snippet intended to be used in the user's readme put it inside of the following tags so that it can be parsed: <mdsnippet></mdsnippet> instead of using \`\`\`markdown. For example, if the user provides you with the following information: Project Name: My Project Description: This is a project that does something cool Programming Language: Python Framework: Flask You should generate the following markdown content: <mdsnippet> # My Project This is a project that does something cool ## Programming Language Python ## Framework Flask </mdsnippet>`;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error(`MongoDB connection error: ${err}`));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/dist', express.static(path.join(__dirname, 'dist')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.post('/chat', async (req, res) => { 
  const { history = [], input: userInput, participantID } = req.body; // Default history
  const systemPrompt = req.body.systemPrompt || systemPrompt;

  // Check for participantID
  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }

  const messages = history.length === 0  
    ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }] 
    : [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userInput }];

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages, // pass messages instead of user input only
        max_tokens: 1500,
      });

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

function generatePrompt(projectInfo) {
  const { projectName, programmingLanguages, configFile: { name, content } } = projectInfo;
  const userInput = `Here's some basic information about my project, help generate a README file given the following information:\n 
  1. Project name: ${projectName};\n
  2. Programming languages used in the project: ${programmingLanguages.join(', ')};\n
  3. Configuration file: ${name} - ${content}\n`;

  const systemPrompt2 = `Please specify what the project is about, how to set up the project, what the dependencies are based on the configuration file, and any other relevant information that should be included in the README file.
  For example, you can provide a brief description of the project, installation instructions, usage examples, and any other relevant information that would help users understand and use the project. Please format dependencies as a table and code snippets as code blocks.`;

  return { userInput, systemPrompt: `${systemPrompt} ${systemPrompt2}` };
}

app.post('/project-info', async (req, res) => {
  const { projectName, programmingLanguages, configFile: { name, content }, participantID } = req.body;

  if (!projectName || !programmingLanguages || !name || !content) {
    return res.status(400).send('Project info is not complete!');
  }

  const { userInput, systemPrompt } = generatePrompt(req.body);

  try {
    const projectInfo = new ProjectInfo({
      projectName,
      programmingLanguages,
      configFile: { name, content }
    });

    await projectInfo.save();

    const botResponse = await axios.post('http://localhost:3000/chat', { input: userInput, systemPrompt, participantID });

    res.json({ userInput, botResponse: botResponse.data.message });
  } catch (error) {
    console.error('Error fetching project info:', error.message);
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});