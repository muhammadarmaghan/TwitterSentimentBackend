const router = require("express").Router();
const mongo = require("mongodb");
const MongoClient = mongo.MongoClient,
  GridFSBucket = mongo.GridFSBucket;
const stream = require("stream");
const _ = require("lodash");
const twitterClient = require("../twitterClient");
const Tweet = require("../models/tweet");
const { performance, PerformanceObserver } = require("perf_hooks");
const TempTweets = require("../models/tempTweets");
const fs = require("fs");
const {
  getProperError,
  getQueryParams,
  getNewTweetsOnlyToSave,
  getTweetsByTimeStamp,
  getTweetSourceCategories,
  sentimentAnalysis,
  getMaxAndSinceID,
} = require("../util");
const tempTweetCollectionName = "temp-tweets";
const tweetCollectionName = "tweets";

function getTweetsByCountAndSetMetaData(tweets, count) {
  let tweetObj = {
    statuses: [],
    search_metadata: tweets.search_metadata,
  };
  tweetObj.statuses = tweets.statuses.splice(0, count);

  tweetObj.search_metadata.max_id =
    tweetObj.statuses[tweetObj.statuses.length - 1].id;
  tweetObj.search_metadata.min_id = tweetObj.statuses[0].id;
  return tweetObj;
}

router.post("/local", async (req, res, next) => {
  let params = req.body;
  let tag = params.q;
  let count = params.count;

  if (!tag)
    return next(getProperError("Please enter tag to search tweets.", 400));

  let tweets = await fetchFromDB(tweetCollectionName, tag);
  if (tweets.error) return next(getProperError(tweets.error, 400));

  let allTweets = count
    ? getTweetsByCountAndSetMetaData(tweets.tweets, count)
    : tweets.tweets;

  sentimentAnalysis(allTweets, function (a, sentimentisedData) {
    var timeBasedTweets = [];
    var tweetsInfo = {
      totalRetweetCount: 0,
      timeBasedTweets: {},
    };
    // sentimentisedData.analyzedData = _.orderBy(sentimentisedData.analyzedData, ['score'], ['asc'])
    tweetsInfo.replies = _.filter(allTweets.statuses, function (t) {
      return t["in_reply_to_user_id"];
    }).length;

    tweetsInfo.retweets = _.filter(allTweets.statuses, function (t) {
      timeBasedTweets.push(new Date(t.created_at));
      tweetsInfo.totalRetweetCount += parseInt(t["retweet_count"]);
      return t["retweet_count"] > 0;
    }).length;

    tweetsInfo.timeBasedTweets = getTweetsByTimeStamp(
      _.sortedUniq(JSON.parse(JSON.stringify(timeBasedTweets))),
      JSON.parse(JSON.stringify(timeBasedTweets))
    );
    tweetsInfo.tweets = _.filter(allTweets.statuses, function (t) {
      return t["retweet_count"] == 0 && !t["in_reply_to_user_id"];
    }).length;
    tweetsInfo.tweetsSourceCategories = getTweetSourceCategories(allTweets);
    sentimentisedData.tweets = allTweets;
    sentimentisedData.otherInfo.tweetsInfo = tweetsInfo;
    res.json(sentimentisedData);
  });
});

// Simple Example to save a file
router.get("/saveFile", async (req, res, next) => {
  let student = {
    name: "Raza",
    age: 23,
    gender: "Male",
    department: "English",
    car: "Suzuki",
  };

  let data = JSON.stringify(student);
  fs.writeFileSync("student-2.json", data);
  res.send("OK");
});

router.put("/", async (req, res, next) => {
  let body = req.body;
  if (!body || !body.q)
    return next(getProperError("Please enter tag to search tweets.", 400));

  let tweetsSavedStatus = await saveTweetsToDB(body.q, next);

  res.json({
    status: 200,
    message: "Saved to Database.",
    tweetsSavedToDB: tweetsSavedStatus,
  });
});

router.post("/", async (req, res, next) => {
  let twitterSecrets = req.body.twitterSecrets;
  let params = req.body.tweetsInfo;
  // let params = getQueryParams(req)
  if (!params)
    return next(getProperError("Please enter tag to search tweets.", 400));

  let tOld = performance.now();
  const tweets = await getAllTweets(params, twitterSecrets);
  console.log(tweets.error);
  if (tweets.error)
    return next(
      getProperError(
        `Twitter API Error: ${tweets.error.message || tweets.error}`,
        400
      )
    );
  let tNew = performance.now();
  let timeTaken = (tNew - tOld) / 1000;
  try {
    tweets.statuses = _.orderBy(tweets.statuses, ["id"], ["asc"]);
    tweets.search_metadata.max_id =
      tweets.statuses[tweets.statuses.length - 1].id;
    tweets.search_metadata.min_id = tweets.statuses[0].id;
    tweets.search_metadata.completed_in = timeTaken + " secs";
  } catch (err) {
    console.log("this error:", err);
  }
  const stTempTweet = await saveTweetsToTempCollection(params.q, tweets);
  if (!stTempTweet)
    return next(
      getProperError("Couldn't save tweets to Temp Tweet Collection.", 400)
    );

  sentimentAnalysis(tweets, function (a, sentimentisedData) {
    var timeBasedTweets = [];
    var tweetsInfo = {
      totalRetweetCount: 0,
      timeBasedTweets: {},
    };
    // sentimentisedData.analyzedData = _.orderBy(sentimentisedData.analyzedData, ['score'], ['asc'])
    tweetsInfo.replies = _.filter(tweets.statuses, function (t) {
      return t["in_reply_to_user_id"];
    }).length;

    tweetsInfo.retweets = _.filter(tweets.statuses, function (t) {
      timeBasedTweets.push(new Date(t.created_at));
      tweetsInfo.totalRetweetCount += parseInt(t["retweet_count"]);
      return t["retweet_count"] > 0;
    }).length;

    tweetsInfo.timeBasedTweets = getTweetsByTimeStamp(
      _.sortedUniq(JSON.parse(JSON.stringify(timeBasedTweets))),
      JSON.parse(JSON.stringify(timeBasedTweets))
    );
    tweetsInfo.tweets = _.filter(tweets.statuses, function (t) {
      return t["retweet_count"] == 0 && !t["in_reply_to_user_id"];
    }).length;
    tweetsInfo.tweetsSourceCategories = getTweetSourceCategories(tweets);
    sentimentisedData.tweets = tweets;
    sentimentisedData.otherInfo.tweetsInfo = tweetsInfo;
    res.json(sentimentisedData);
  });
});

function getTweets(params, twitterConfig) {
  return new Promise((resolve, reject) => {
    twitterClient(twitterConfig).get(
      "search/tweets",
      params,
      (error, tweets) => {
        if (error) resolve({ error: error });
        else resolve(tweets);
      }
    );
  });
}

function getCustomizedTweetObject(tweets) {
  let newTweets = [];

  for (let i = 0; i < tweets.length; i++) {
    let t = tweets[i];
    let u = JSON.parse(JSON.stringify(t && t.user ? t.user : {}));
    let rtSt = JSON.parse(
      JSON.stringify(t && t.retweeted_status ? t.retweeted_status : {})
    );
    let rtStU = JSON.parse(JSON.stringify(rtSt && rtSt.user ? rtSt.user : {}));
    let ntObj = {
      id: t.id,
      id_str: t.id_str,
      text: t.text || "",
      geo: t.geo || "",
      created_at: t.created_at,
      coordinates: t.coordinates || "",
      place: t.place || "",
      retweet_count: t.retweet_count || 0,
      favorite_count: t.favorite_count || 0,
      in_reply_to_user_id: t.in_reply_to_user_id,
      user: {
        id: u.id || "",
        name: u.name || "",
        description: u.description || "",
        location: u.location || "",
        url: u.url || "",
        followers_count: u.followers_count || 0,
        friends_count: u.friends_count || 0,
        favourites_count: u.favourites_count || 0,
        statuses_count: u.statuses_count || 0,
        profile_image: u.profile_image_url_https || "",
      },
      retweeted_status: {
        id: rtSt.id || "",
        text: rtSt.text || "",
        retweet_count: rtSt.retweet_count || 0,
        favorite_count: rtSt.favorite_count || 0,
        user: {
          id: rtStU.id || "",
          name: rtStU.name || "",
          location: rtStU.location || "",
          description: rtStU.description || "",
          followers_count: rtStU.followers_count || 0,
          friends_count: rtStU.friends_count || 0,
          listed_count: rtStU.listed_count || 0,
          favourites_count: rtStU.favourites_count || 0,
          statuses_count: rtStU.statuses_count || 0,
        },
      },
    };
    newTweets.push(ntObj);
  }
  return newTweets;
}

async function getAllTweets(params, twitterClientConfig) {
  if (params.count <= 100) {
    let tweets = await getTweets(
      { q: params.q, count: params.count },
      twitterClientConfig
    );

    if (
      !tweets ||
      (tweets && tweets.error) ||
      (tweets && tweets.statuses && tweets.statuses.length === 0)
    )
      return { error: `No tweet found against this tag: "${params.q}".` };

    tweets.statuses = getCustomizedTweetObject(tweets.statuses);

    return tweets;
  } else if (params.count > 100) {
    let tweets = { statuses: [], search_metadata: null };
    let i = Math.floor(params.count / 100);
    let lastCallCount = params.count - i * 100;
    let newParams = null;
    for (let j = 1; j <= i; j++) {
      let p = newParams || {
        q: params.q,
        count: j * 100,
      };
      let t0 = performance.now();
      let t = await getTweets(p, twitterClientConfig);
      if (t.error && tweets.statuses.length == 0) return t;
      else {
        t.statuses = getCustomizedTweetObject(t.statuses);
        tweets.statuses = tweets.statuses.concat(t.statuses);
        tweets.search_metadata = t.search_metadata;
        newParams = t.search_metadata.next_results
          ? getQueryParams({ url: t.search_metadata.next_results })
          : null;
        if (!newParams) {
          break;
        }
      }
      let t1 = performance.now();
      console.log("Tweets Obtained: ", j * 100);
      console.log(`Time Taken: ${(t1 - t0) / 1000} seconds`);
    }
    if (lastCallCount > 0) {
      console.log("Last Call Count: ", lastCallCount);
      newParams.count = lastCallCount;
      let p = newParams;
      let t = await getTweets(p, twitterClientConfig);
      if (t.error && tweets.statuses.length == 0) return t;
      else {
        t.statuses = getCustomizedTweetObject(t.statuses);
        tweets.statuses = tweets.statuses.concat(t.statuses);
        tweets.search_metadata = t.search_metadata;
      }
    }

    tweets.search_metadata.count = tweets.statuses.length;
    console.log("All Tweets Here: ", tweets.statuses.length);

    return tweets;
  }
}

router.get("/gridfs", async (req, res, next) => {
  const dbResp = await saveToDB(
    "temp-tweets",
    "corona",
    "The quick brown fox jumps over the lazy dog."
  );
  if (dbResp.error)
    return next(
      getProperError("Unable to save tweets to DB: " + dbResp.error, 400)
    );
  res.json({
    success: true,
  });
});

router.get("/gridfsget", async (req, res, next) => {
  const response = await fetchFromDB("temp-tweets", "corona");
  res.json({
    success: true,
    data: response,
  });
});

async function saveTweetsToTempCollection(tag, tweets) {
  try {
    tweets.statuses = _.orderBy(tweets.statuses, ["id"], ["asc"]);
    const objToSave = {
      tag: tag,
      tweets: tweets,
    };
    const dbResp = await saveToDB(
      tempTweetCollectionName,
      tag,
      JSON.stringify(objToSave)
    );
    if (dbResp.error)
      return next(
        getProperError("Unable to save tweets to DB: " + dbResp.error, 400)
      );

    return dbResp;
  } catch (ex) {
    return { error: "Exception while saving temp tweets to DB." };
  }
}

async function saveTweetsToDB(tag, next) {
  let tempTweets = await fetchFromDB(tempTweetCollectionName, tag);
  if (tempTweets.error)
    return next(getProperError("No record found against entered Tag.", 400));

  let tweetsFromDB = await fetchFromDB(tweetCollectionName, tag);
  let tweetsSavedStatus = null;

  if (tweetsFromDB && !tweetsFromDB.error) {
    console.log(tweetsFromDB);
    const copyTweetsFromDB = JSON.parse(JSON.stringify(tweetsFromDB));
    let newTweets = getNewTweetsOnlyToSave(
      copyTweetsFromDB.tweets,
      tempTweets.tweets
    );
    let mergedTweetList = [...copyTweetsFromDB.tweets.statuses, ...newTweets];
    let maxMinID = getMaxAndSinceID(mergedTweetList);

    copyTweetsFromDB.tweets.statuses = _.orderBy(
      mergedTweetList,
      ["id"],
      ["asc"]
    );
    copyTweetsFromDB.tweets.search_metadata.since_id = maxMinID.sinceID;
    copyTweetsFromDB.tweets.search_metadata.max_id = maxMinID.maxID;

    tweetsFromDB.tweets = copyTweetsFromDB.tweets;
    tweetsSavedStatus = await saveToDB(
      tweetCollectionName,
      tag,
      JSON.stringify(tweetsFromDB)
    );
  } else {
    const tweetsObj = {
      statuses: tempTweets.tweets.statuses,
      search_metadata: tempTweets.tweets.search_metadata,
    };
    const tweetsModel = {
      tag: tag,
      tweets: tweetsObj,
    };
    tweetsSavedStatus = await saveToDB(
      tweetCollectionName,
      tag,
      JSON.stringify(tweetsModel)
    );
  }

  return tweetsSavedStatus;
}

function MongoClient2(mongoUrl) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(
      mongoUrl,
      { useUnifiedTopology: true },
      function (err, db) {
        if (err) {
          console.log("********* MONGO DB CONNECTION ERROR *********");
          console.log(err);
          reject({ error: err });
        } else {
          resolve(db);
        }
      }
    );
  });
}

async function saveToDB(collectionName, tag, data) {
  const mongoURL = process.env.DB_CONNECT;
  const dbName = process.env.DB_NAME;

  const client = await MongoClient2(mongoURL);
  if (client.error) return client;

  const dbObj = client.db(dbName);
  const itemStored = await saveInGridFS(dbObj, collectionName, tag, data);

  return itemStored;
}

async function fetchFromDB(collectionName, tag) {
  const mongoURL = process.env.DB_CONNECT;
  const dbName = process.env.DB_NAME;

  const client = await MongoClient2(mongoURL);
  if (client.error) return client;

  const dbObj = client.db(dbName);
  const response = await getFromGridFS(dbObj, collectionName, tag);

  return response && !response.error ? JSON.parse(response) : response;
}

function getFromGridFS(dbo, collection, filename) {
  var buf = new Buffer("");
  return new Promise(function (resolve, reject) {
    var bucket = new GridFSBucket(dbo, {
      bucketName: collection,
      chunkSizeBytes: 255 * 1024,
      disableMD5: true,
    });
    var readstream = bucket.openDownloadStreamByName(filename);
    readstream.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
    });
    readstream.on("error", (err) => {
      resolve({ error: err });
    });
    readstream.on("end", () => {
      var res = buf.toString();
      buf = null; // Clean up memory
      readstream.destroy();
      resolve(res);
    });
  });
}

function saveInGridFS(dbo, collection, filename, data) {
  var putItemHelper = function (bucket, resolve, reject) {
    var writeStream = bucket.openUploadStreamWithId(filename, filename);
    var s = new stream.Readable();
    s.push(data);
    s.push(null); // Push null to end stream
    s.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  };
  return new Promise(function (resolve, reject) {
    var bucket = new GridFSBucket(dbo, {
      bucketName: collection,
      chunkSizeBytes: 255 * 1024,
      disableMD5: true,
    });
    bucket.find({ _id: filename }).count(function (err, count) {
      if (err) return resolve({ error: err });
      if (count > 0) {
        bucket.delete(
          filename,
          function () {
            putItemHelper(bucket, resolve, resolve);
          },
          resolve
        );
      } else {
        putItemHelper(bucket, resolve, resolve);
      }
    }, resolve);
  });
}

module.exports = router;
