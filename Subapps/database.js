var mongoose = require('mongoose');
var db = mongoose.connection;

// Database Init.
var mongoDatabase = (process.env.MONGODATA || "folgur");
var mongoUri = (process.env.ISHEROKU == "1" ? process.env.MONGOURI : "localhost:56789/"+mongoDatabase);
var options = (process.env.MONGOPROD == "1" ? { replset: { rs_name: '' } } : {});

function ConnectWithRetry() {
	return mongoose.connect(mongoUri, options, function(err) {
		if (err)
		{
			console.log("Database failed to connect on startup. Retrying in 5 seconds: " + err);
			setTimeout(ConnectWithRetry, 5000);
		}
	});
}

// DB Events
db.on('error', function(err) {
	
	if (err) console.log("Database error: " + err);
});
db.on('open', function (callback) {
	
	console.log("Database connected.");
});
db.on('reconnected', function (callback) {
	
	console.log("Database reconnected.");
});
db.on('disconnected', function (callback) {
	
	console.log("Database disconnected.");
});

// Database Schemas
var favoriteSchema = mongoose.Schema({
	
	id: String,
	name: String,
	title: String,
	isMp4: Boolean,
	link: String,
	thumbnail: String
}, { _id : false });
var folderSchema = mongoose.Schema({
	
	name: String,
	safe: String,
	folders: [this],
	images: [favoriteSchema]
}, { _id : false });

var userSchema = mongoose.Schema({
	
	token: String,
	userid: String,
	username: String,
	createdAt: Number,
	imgurAccess: String,
	imgurRefresh: String,
	imgurExpiry: Number,
	folders: [folderSchema],
	sorted: [String],
	totalFolders: Number,
	dontShowFolderRemove: Boolean,
	dontShowImageRemove: Boolean,
	supporter: Boolean
});

userSchema.set('autoIndex', false);
userSchema.set('collection', 'users');

var User = mongoose.model('User', userSchema);

// Begin connection attempts.
ConnectWithRetry();
console.log("Database connecting. URI: " + mongoUri);

module.exports = {
		
	Database: db,
	User: User,
};