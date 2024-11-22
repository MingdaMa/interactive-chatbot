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

const SYSTEM_PROMPT = `You are a helpful assistant that helps developers create a ReadMe for their projects. Given information about a project,  you should be able to generate a markdown ReadMe file for the project. The user will provide you with information such as programming languages, frameworks, project description, or configuration files such as package.json, requirements.txt, Makefile, etc. You should take all of this information and generate markdown content that can be used as a ReadMe file for the project. Whenever you create a markdown snippet intended to be used in the user's readme put it inside of the following tags so that it can be parsed: <mdsnippet></mdsnippet> instead of using \`\`\`markdown. For example, if the user provides you with the following information: Project Name: My Project Description: This is a project that does something cool Programming Language: Python Framework: Flask You should generate the following markdown content: <mdsnippet> # My Project This is a project that does something cool ## Programming Language Python ## Framework Flask </mdsnippet>`;

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
  const systemPrompt = req.body.systemPrompt || SYSTEM_PROMPT;

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
  let userInput = `Here's some basic information about my project, help generate a README file given the following information:\n`;
  let index = 0;
  for (const key in projectInfo) {
    index += 1;
    const title = key
      .replace(/([A-Z])/g, " $1") // Insert space before each uppercase letter
      .replace(/^./, match => match.toUpperCase()); // Capitalize the first letter

    if (projectInfo[key] instanceof Array) { 
      userInput += `${index}. ${title}: ${projectInfo[key].join(', ')};\n`;
     } else if (key === 'configFile') {
      userInput += `${index}. ${title}: ${projectInfo[key].name} - ${projectInfo[key].content};\n`;
     } else {
      userInput += `${index}. ${title}: ${projectInfo[key]};\n`;
     }
  }
  console.log(userInput);
  const readmeGenerationPrompt = `Please specify what the project is about, how to set up the project, what the dependencies are based on the configuration file, and any other relevant information that should be included in the README file.
  Please format dependencies as a table and code snippets as code blocks. Author names and their github handles are stored in two different arrays in the same order. Please format the authors names as a list and link the names to their github profile page.`;

  return { userInput, systemPrompt: `${systemPrompt} ${readmeGenerationPrompt}` };
}

app.post('/project-info', async (req, res) => { 
  const { participantID, ...projectInfo } = req.body;
  const { projectName, programmingLanguages, authorNames, githubHandles, githubRepo, description, configFile: { name, content } } = projectInfo;

  if (!projectName || !programmingLanguages || !name || !content) {
    return res.status(400).send('Project info is not complete!');
  }

  const { userInput, systemPrompt } = generatePrompt(projectInfo);

  try {
    const projectInfo = new ProjectInfo({
      projectName,
      programmingLanguages,
      configFile: { name, content },
      authorNames,
      githubHandles,
      githubRepo,
      description
    });

    await projectInfo.save();

    const botResponse = await axios.post('http://localhost:3000/chat', { input: userInput, systemPrompt, participantID });

    res.json({ userInput, botResponse: botResponse.data.message });
  } catch (error) {
    console.error('Error fetching project info:', error.message);
    res.status(500).send('Server Error');
  }
});

app.post('/redirect-to-survey', (req, res) => {
  const { participantID, surveyCategory } = req.body;  // Getting participantID from request body
  
  let qualtricsBaseUrl;
  // Base Qualtrics URL from Step 2
  if (surveyCategory === 'demographics') {
    qualtricsBaseUrl = 'https://usfca.qualtrics.com/jfe/form/SV_3EqGE3EDAi4bGUm';
  } else if (surveyCategory === 'pre-task') {
    // TODO: Update the Qualtrics URL for the pre-task survey
    qualtricsBaseUrl = 'https://usfca.qualtrics.com/jfe/form/SV_0W13FO2RouHpH0y';
  } else if (surveyCategory === 'post-task') {
     // TODO: Update the Qualtrics URL for the post-task survey
    qualtricsBaseUrl = 'https://usfca.qualtrics.com/jfe/form/SV_dgV6HO2y5QdDd3M';
  }
  
  // Add the participant ID as a URL parameter
  const surveyUrl = `${qualtricsBaseUrl}?participantID=${encodeURIComponent(participantID)}`;
  
  // Send the URL back to the client
  res.send(surveyUrl);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);  
});