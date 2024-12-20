const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventLogSchema = new Schema({
    participantID: String,
    eventType: String,
    elementName: String,
    modelType: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EventLog', EventLogSchema);