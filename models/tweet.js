const mongoose = require('mongoose')

const tweetSchema = new mongoose.Schema({
	tag: {
		type: String
	},
	tweets: {
		type: Object
	}
})

module.exports = mongoose.model('tweets', tweetSchema)
