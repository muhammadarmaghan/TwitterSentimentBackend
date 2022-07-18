const Twitter = require('twitter')

const client = function (config) {
	return new Twitter({
		consumer_key: config.apiKey,
		consumer_secret: config.apiSecret,
		access_token_key: config.accessToken,
		access_token_secret: config.accessTokenSecret
	});
}

module.exports = client
