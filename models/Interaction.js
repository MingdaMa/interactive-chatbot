const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InteractionSchema = new Schema({
    userInput: String,
    botResponse: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Interaction',
InteractionSchema);