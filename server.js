const express = require('express')
const app = express()
const _ = require('lodash')
const port = 3200
const dotenv = require('dotenv')
const Tweet = require('./models/tweet')
const cors = require('cors');
dotenv.config();

// IMPORT ROUTES HERE
const tweetsRouter = require('./routes/tweets')

app.use(cors());
app.options('*',(req,res,next)=> {
	res.set('Access-Control-Allow-Origin','*');
	res.send('ok');
	next();
});
app.use((req,res,next)=> {
	res.set('Access-Control-Allow-Origin','*');
	next();
})
// MIDDLEWARES HERE
app.use(express.json())
app.use('/api/tweets', tweetsRouter)
app.use((req, res, next) => {
	const err = new Error("Not Found")
	err.status = 404
	next(err)
})

// Error Handler
app.use((err, req, res, next) => {
	res.status(err.status || 500)
	res.send({
		error: {
			status: err.status || 500,
			message: err.message,
			errors: err.errors
		}
	})
})


app.listen(process.env.PORT || port, () => console.log(`Example app listening on port ${process.env.PORT || port}!`));
