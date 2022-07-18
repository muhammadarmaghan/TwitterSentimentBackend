const mongoose = require('mongoose')

const tempTweetSchema = new mongoose.Schema({
	tag: {
		type: String
	},
	tweets: {
		type: Object
	},
	expireAt: {
		type: Date,
		default: Date.now,
		expires: 600
	}
})

module.exports = mongoose.model('tempTweets', tempTweetSchema)
