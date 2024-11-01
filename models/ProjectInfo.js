const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectInfoSchema = new Schema({
    participantID: String,
    projectName: String,
    programmingLanguages: [String],
    configFile: {
      name: String,
      content: String
    },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProjectInfo', ProjectInfoSchema);