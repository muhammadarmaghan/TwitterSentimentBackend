
Pre-Requisites & Setup Steps
1. Install NodeJS (v10.19.0) 

   https://nodejs.org/download/release/v10.19.0/
2. Install MongoDB 

   https://medium.com/@LondonAppBrewery/how-to-download-install-mongodb-on-windows-4ee4b3493514
3. run mongodb locally
4. Open Node Project
5. run "npm install"
6. run nodemon start



# Twitter Sentiment Analysis

### 1. Tweets From Twitter Client
**Description:**

This API is responsible for the following:  
* Getting tweets from Twitter Client for specific Tag
* Apply sentiment analysis
* Save tweets instantly in Temp mongo collection (via GridFS) for specific Tag
* If specified tag already exist in Temp Collection then remove the existing data and insert new results
 
 
**URL:** http://localhost:3200/api/tweets
 
**Method:** POST
 
**Body:** 
   
    {
        "tweetsInfo": {
            "count": 20,		
            "q": "UmerFaziZamiQazi"
        },
        "twitterSecrets": {
            "apiKey": "*********************",
            "apiSecret": "************************************",
            "accessToken": "*******************************",
            "accessTokenSecret": "************************************"
        }
    }

**Response**

*Success:*

    {
        "otherInfo": {
            "sentiment": {
                "great": 0,
                "good": 0,
                "neutral": 0,
                "bad": 0,
                "terrible": 1
            },
            "tweetsInfo": {
                "totalRetweetCount": 47858,
                "timeBasedTweets": {
                    "2020-08-05T11:47:54.000Z": 1
                },
                "replies": 0,
                "retweets": 1,
                "tweets": 0,
                "tweetsSourceCategories": {}
            }
        },
        "tweets": {
            "statuses": [
                {
                    "id": 1290977830839431200,
                    "id_str": "1290977830839431168",
                    "text": "RT @adoraIbe: a country that depends on imports to survive has officially lost its main sea port mid famine, covid-19, and an economic coll…",
                    "geo": "",
                    "created_at": "Wed Aug 05 11:47:54 +0000 2020",
                    "coordinates": "",
                    "place": "",
                    "retweet_count": 47858,
                    "favorite_count": 0,
                    "in_reply_to_user_id": null,
                    "user": {
                        "id": 290572766,
                        "name": "tiff",
                        "description": "",
                        "location": "",
                        "url": "https://t.co/fZ5E9vCXm4",
                        "followers_count": 481,
                        "friends_count": 555,
                        "favourites_count": 39768,
                        "statuses_count": 18741,
                        "profile_image": "https://pbs.twimg.com/profile_images/1267936710169694208/02JXqCpT_normal.jpg"
                    },
                    "retweeted_status": {
                        "id": 1290731866518061000,
                        "text": "a country that depends on imports to survive has officially lost its main sea port mid famine, covid-19, and an eco… https://t.co/L8MulflDfO",
                        "retweet_count": 47858,
                        "favorite_count": 105292,
                        "user": {
                            "id": 3261765048,
                            "name": "sarah",
                            "location": "she/her",
                            "description": "adora thirst account",
                            "followers_count": 3242,
                            "friends_count": 238,
                            "listed_count": 24,
                            "favourites_count": 38825,
                            "statuses_count": 47985
                        }
                    }
                }
            ],
            "search_metadata": {
                "completed_in": "0.6944060900211334 secs",
                "max_id": 1290977830839431200,
                "max_id_str": "1290977830839431168",
                "next_results": "?max_id=1290977830839431167&q=covid&count=1&include_entities=1",
                "query": "covid",
                "refresh_url": "?since_id=1290977830839431168&q=covid&include_entities=1",
                "count": 1,
                "since_id": 0,
                "since_id_str": "0",
                "min_id": 1290977830839431200
            }
        }
    }
 
*Error:*

    {
        "error": {
            "status": 400,
            "message": "Twitter API Error: No tweet found against this tag: \"UmerFaziZamiQazi\"."
        }
    }

#


### 2. Tweets From Database
**Description:**

This API is responsible for the following:
* Get Tweets from the MongoDB via GridFS module
* Apply sentiment analysis 
 
**URL:** http://localhost:3200/api/tweets/local
 
**Method:** Get
 
**Body:** 
   
    {
    	"q": "covid",
    	"count": 1
    }

**Response:**

*Success:*

    {
        "otherInfo": {
            "sentiment": {
                "great": 0,
                "good": 1,
                "neutral": 0,
                "bad": 0,
                "terrible": 0
            },
            "tweetsInfo": {
                "totalRetweetCount": 28,
                "timeBasedTweets": {
                    "2020-07-24T16:56:57.000Z": 1
                },
                "replies": 0,
                "retweets": 1,
                "tweets": 0,
                "tweetsSourceCategories": {}
            }
        },
        "tweets": {
            "statuses": [
                {
                    "id": 1286706950219194400,
                    "id_str": "1286706950219194368",
                    "text": "RT @VeritasVital: Cute attempt. https://t.co/ZtjK3CBs9x",
                    "geo": "",
                    "created_at": "Fri Jul 24 16:56:57 +0000 2020",
                    "coordinates": "",
                    "place": "",
                    "retweet_count": 28,
                    "favorite_count": 0,
                    "in_reply_to_user_id": null,
                    "user": {
                        "id": 1230544369524072400,
                        "name": "💫Bodhisattva🐬💫",
                        "description": "#NVLD #Buddhism 🌟Splitting timelines: Choose a Path 🌟  🌎 @POTUS 🌍 @KingJohnUK  🌟 https://t.co/z6RTz8Aqdr 🌟",
                        "location": "United States of America",
                        "url": "https://t.co/UTHIr4jSL2",
                        "followers_count": 807,
                        "friends_count": 173,
                        "favourites_count": 25530,
                        "statuses_count": 35029,
                        "profile_image": "https://pbs.twimg.com/profile_images/1230544758147371008/-BXQ7qhf_normal.jpg"
                    },
                    "retweeted_status": {
                        "id": 1286482907373228000,
                        "text": "Cute attempt. https://t.co/ZtjK3CBs9x",
                        "retweet_count": 28,
                        "favorite_count": 139,
                        "user": {
                            "id": 1153301460362367000,
                            "name": "VeritasVital",
                            "location": "",
                            "description": "Yes, things are happening.\n\nNo, I'm not complacent.\n\nYes, your own freedom is yours to grab anytime you want to reclaim your mind from those who manipulate it.",
                            "followers_count": 18353,
                            "friends_count": 577,
                            "listed_count": 53,
                            "favourites_count": 84093,
                            "statuses_count": 43849
                        }
                    }
                }
            ],
            "search_metadata": {
                "completed_in": "4.082607936978341 secs",
                "max_id": 1286706950219194400,
                "max_id_str": "1286706965301923841",
                "next_results": "?max_id=1286706950219194367&q=covid&count=100&include_entities=1",
                "query": "covid",
                "refresh_url": "?since_id=1286706965301923841&q=covid&include_entities=1",
                "count": 200,
                "since_id": 1286706950219194400,
                "since_id_str": "0",
                "min_id": 1286706950219194400
            }
        }
    }
 
*Error:*

    {
        "error": {
            "status": 400,
            "message": "Error: FileNotFound: file temperature was not found"
        }
    }


#

### 3. Save recently searched tweets by tag into DB
**Description:**

This API is responsible for the following:
* Check Temp Collection for the specified tag
    * If exist, then only append new tweets to the collection and ignore tweets with same IDs
    * Else add tweets against specified tag  
 
**URL:** http://localhost:3200/api/tweets
 
**Method:** PUT
 
**Body:** 
   
    {
    	"q": "covid"
    }

**Response:**

*Success:*

    {
        "status": 200,
        "message": "Saved to Database.",
        "tweetsSavedToDB": {
            "_id": "covid",
            "length": 256957,
            "chunkSize": 261120,
            "uploadDate": "2020-08-05T11:55:08.328Z",
            "filename": "covid",
            "md5": "11a5d271db343d2f4d471d0a3d1876b2"
        }
    }
 
*Error:*

    {
        "error": {
            "status": 400,
            "message": "No record found against entered Tag."
        }
    }
