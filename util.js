const url = require('url')
const querystring = require('querystring')
const async = require('async')
const Sentiment = require('sentiment')
const _ = require('lodash')



const sentiment = new Sentiment();

function getQueryParams (req) {
	let query = url.parse(req.url).query
	if (!querystring.parse(query).q) {
		return false
	}
	return {
		q: querystring.parse(query).q,
		geocode: querystring.parse(query).geocode,
		lang: querystring.parse(query).lang,
		locale: querystring.parse(query).locale,
		result_type: querystring.parse(query).result_type,
		count: querystring.parse(query).count,
		until: querystring.parse(query).until,
		since_id: querystring.parse(query).since_id,
		max_id: querystring.parse(query).max_id,
		include_entities: querystring.parse(query).include_entities
	}
}


function sentimentAnalysis (tweets, callback) {
	let twitterDataObj = {
		// analyzedData: [],
		otherInfo: {
			sentiment: {
				great: 0,
				good: 0,
				neutral: 0,
				bad: 0,
				terrible: 0
			}
		}
	};
	async.each(tweets.statuses, function (item, callEach) {
		sentiment.analyze(item.text, function (err, data) {
			let tweet_sentiment = '';
			if (data.score == 0) {
				tweet_sentiment = 'neutral'
				twitterDataObj.otherInfo.sentiment.neutral++;
			} else if (data.score > 0 && data.score < 4) {
				tweet_sentiment = 'Good'
				twitterDataObj.otherInfo.sentiment.good++;
			} else if (data.score > 3) {
				tweet_sentiment = 'Great'
				twitterDataObj.otherInfo.sentiment.great++;
			} else if (data.score < 0 && data.score > -4) {
				tweet_sentiment = 'Bad'
				twitterDataObj.otherInfo.sentiment.bad++;
			} else if (data.score < -3) {
				tweet_sentiment = 'Terrible'
				twitterDataObj.otherInfo.sentiment.terrible++;
			}
			// twitterDataObj.analyzedData.push({
			// 	sentiment: tweet_sentiment,
			// 	score: data.score,
			// 	tweet: item.text
			// });
			callEach();
		});
	}, function () {
		callback(null, twitterDataObj);
	});
}



function getTweetSourceCategories (tweets) {
	let categories = {};
	_.forEach(tweets.statuses, function(value, key) {
		if (value.source) {
			let source = value.source.replace(/<[^>]*>/g, '');
			if (Object.keys(categories).indexOf(source) == -1) {
				categories[source] = 1;
			} else {
				categories[source]++;
			}
		}

		if (value.retweeted_status && value.retweeted_status.source) {
			let source = value.retweeted_status.source.replace(/<[^>]*>/g, '');
			if (Object.keys(categories).indexOf(source) == -1) {
				categories[source] = 1;
			} else {
				categories[source]++;
			}
		}
	});
	return categories;
}


function getTweetsByTimeStamp (uniqueTimeStamp, allTimeStamps) {
	let arrayToObj = {};
	_.forEach(uniqueTimeStamp, function (i) {
		arrayToObj[i] = 0;
	});
	_.forEach(allTimeStamps, function (i) {
		if (arrayToObj[i] !== null || arrayToObj[i] !== undefined) {
			arrayToObj[i]++;
		}
	});
	return arrayToObj;
}


function getNewTweetsOnlyToSave (oldTweets, newTweets) {
	oldTweets.statuses = _.orderBy(oldTweets.statuses, ['id'], ['asc'])
	newTweets.statuses = _.orderBy(newTweets.statuses, ['id'], ['asc'])

	if (oldTweets && newTweets) {
		if (oldTweets.search_metadata) {
			if (oldTweets.search_metadata.max_id < newTweets.statuses[0].id) {
				return newTweets.statuses;
			} else {
				return _.filter(newTweets.statuses, function(o) { return o.id > oldTweets.search_metadata.max_id; });
			}
		}
	}

}

const getProperError = (msg, statusCode) => {
	let err = new Error(msg)
	err.status = statusCode
	return err
}

function getMaxAndSinceID (tweetsArray) {
	let maxID = 0
	let sinceID = tweetsArray[0].id

	for (let i = 0; i< tweetsArray.length; i++) {
		if (tweetsArray[i].id > parseInt(maxID)){
			maxID = tweetsArray[i].id + ""
		}
		if (tweetsArray[i].id < parseInt(sinceID)) {
			sinceID = tweetsArray[i].id; + ""
		}
	}
	return {
		maxID: maxID,
		sinceID: sinceID
	}
}


module.exports.getProperError = getProperError
module.exports.getMaxAndSinceID = getMaxAndSinceID
module.exports.getQueryParams = getQueryParams
module.exports.getNewTweetsOnlyToSave = getNewTweetsOnlyToSave
module.exports.getTweetsByTimeStamp = getTweetsByTimeStamp
module.exports.getTweetSourceCategories = getTweetSourceCategories
module.exports.sentimentAnalysis = sentimentAnalysis
