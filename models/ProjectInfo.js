const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectInfoSchema = new Schema({
    participantID: String,
    projectName: String,
    authorNames: [String],
    githubHandles: [String],
    repoLink: String,
    programmingLanguages: [String],
    description: String,
    configFile: {
      name: String,
      content: String
    },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProjectInfo', ProjectInfoSchema);