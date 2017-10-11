var express = require('express');
var router = express.Router();
var file = require('fs');
var dbModule = require('./database');
var request = require('request');
var crypto = require('crypto');

var readme = file.readFileSync("README.md").toString();

var User = dbModule.User;

var imgurClient = process.env.IM_CLIENT || "";
var imgurSecret = process.env.IM_SECRET || "";
var imgurRedrct = process.env.IM_REDRCT || "";

router.get('/*', function (req, res, next) {
	
	req.plat = req.hostname.split('.')[0];
	
	if (req.path.indexOf("/auth") != 0 &&
		req.path.indexOf("/about") != 0)
	{
		var search;
		
		if (req.cookies.token)
		{
			search = { token: req.cookies.token }
		}
		else
		{
			console.log("No token cookie");
			res.redirect('/auth');
			return;
		}
		
		User.findOne(search, function(err, found) {
			
			if (err) { res.redirect('/auth/error'); return; }
			if (!found) { console.log("Token not found"); res.redirect('/auth'); return; }
			
			if (new Date().getTime() > found.imgurExpiry)
			{
				RefreshImgur(found.imgurRefresh, function(refreshData) {
					
					if (refreshData.error) { res.redirect('/auth/error'); return; }
					
					found.imgurAccess = refreshData.access;
					found.imgurRefresh = refreshData.refresh;
					found.imgurExpiry = refreshData.expiry;
					found.save(function(err2, saved) {
						
						req.user = saved;
						next();
					});
				});

				return;
			}
			
			req.user = found;
			next();
		});
		
		return;
	}
	
	next();
});
router.post('/*', function (req, res, next) {
	
	req.plat = req.hostname.split('.')[0];
	
	var token = req.body.token;
	
	if (req.path.indexOf("/auth") != 0)
	{
		if (!token)
		{
			res.status(401).json({ error: "Not authorized." });
			return;
		}
		
		User.findOne({ token: token }, function(err, found) {
			
			if (err) { res.status(500).json({ error: "Database error." }); return; }
			if (!found) { res.status(404).json({ error: "Token not found." }); return; }
			
			if (new Date().getTime() > found.imgurExpiry)
			{
				RefreshImgur(found.imgurRefresh, function(refreshData) {
					
					if (refreshData.error) { res.status(500).json({ error: "Can't refresh token." }); return; }
					
					found.imgurAccess = refreshData.access;
					found.imgurRefresh = refreshData.refresh;
					found.imgurExpiry = refreshData.expiry;
					found.save(function(err2, saved) {
						
						req.user = saved;
						next();
					});
				});

				return;
			}
			
			req.user = found;
			next();
		});
		return;
	}
	
	next();
});

router.get('/', function(req, res) {
	
	res.render('app', { plat: req.plat, client: imgurClient, user: req.user });
});
router.get('/help', function(req, res) {
	
	res.render('help');
});
router.get('/about', function(req, res) {
	
	res.render('about', { readme: readme });
});

router.get('/auth/iauth', function(req, res) { res.render('auth/iauth'); });
router.get('/auth/error', function(req, res) { res.render('auth/error'); });

router.get('/auth', function(req, res) {
	
	res.render('login', { authLink: "https://api.imgur.com/oauth2/authorize?client_id=" + imgurClient + "&response_type=token" });
});
router.post('/auth', function(req, res) {
	
	if (!req.body.access || req.body.access == "") { res.json({ error: "Invalid" }); return; }
	if (!req.body.refresh || req.body.refresh == "") { res.json({ error: "Invalid" }); return; }
	if (!req.body.expiry || req.body.expiry == "" || isNaN(parseInt(req.body.expiry))) { res.json({ error: "Invalid" }); return; }
	if (!req.body.username || req.body.username == "") { res.json({ error: "Invalid" }); return; }
	if (!req.body.id || req.body.id == "") { res.json({ error: "Invalid" }); return; }
	
	AuthImgur({
		access: req.body.access,
		refresh: req.body.refresh,
		expiry: parseInt(req.body.expiry),
		username: req.body.username,
		id: req.body.id
	}, function(data) {

		res.json(data);
	});
});

router.get('/folders', function(req, res) {
	
	res.json({ payload: JSON.stringify({ folders: req.user.folders, sorted: req.user.sorted, count: req.user.totalFolders }) });
});

router.post('/refresh/imgur', function(req, res) {
	
	RefreshImgur(req.user.imgurRefresh, function(refreshData) {

		if (refreshData.error) { res.status(500).json(refreshData); return; }

		res.json({ token: refreshData.access });

		req.user.imgurAccess = refreshData.access;
		req.user.imgurRefresh = refreshData.refresh;
		req.user.imgurExpiry = refreshData.expiry;
		req.user.save();
	});
});

router.post('/actions/addimg', function(req, res) {
	
	var data;
	try { data = JSON.parse(req.body.data); }
	catch (e) { res.status(400).json({ error: "Invalid Data." }); return; }
	
	if (!data.path || !Array.isArray(data.path)) { res.status(400).json({ error: "Invalid Data." }); return; }
	if (!data.image) { res.status(400).json({ error: "Invalid Data." }); return; }
	
	if (!data.image.id ||
		!data.image.title ||
		!data.image.link ||
		!data.image.thumbnail)
	{
		res.status(400).json({ error: "Invalid Data." }); return;
	}
	
	var folderData = GetFolderInfo(data.path, req.user);
	if (folderData.error) { res.status(folderData.status).json(folderData); return; }
	
	if (!folderData.parent)
	{
		if (folderData.levels + req.user.totalFolders >= 50)
		{ res.status(400).json({ error: "Can't make folders more than 5 levels deep." }); return; }
		if (folderData.levels + folderData.subs.length >= 5)
		{ res.status(400).json({ error: "Can't make folders more than 5 levels deep." }); return; }
		
		var currentFolder = folderData.folder;
		
		for (var i = 0; i < folderData.subs.length; i++)
		{
			if (TestFolderName(folderData.subs[i].name) != "" || TestFolderSafe(folderData.subs[i].safe) != "")
			{ res.status(400).json({ error: "Invalid Data." }); return; }
			
			var newFolder = {
				
				name: folderData.subs[i].name,
				safe: folderData.subs[i].safe,
				folders: [],
				images: []
			};
			
			currentFolder.folders.push(newFolder);
			currentFolder = currentFolder.folders[currentFolder.folders.length - 1];
			req.user.totalFolders++;
		}
		
		currentFolder.images.push({
			
			id: data.image.id,
			name: data.image.name || data.image.title,
			title: data.image.title,
			link: data.image.link,
			thumbnail: data.image.thumbnail,
			isMp4: data.image.isMp4
		});
	}
	else
	{
		folderData.folder.images.push({
			
			id: data.image.id,
			name: data.image.name || data.image.title,
			title: data.image.title,
			link: data.image.link,
			thumbnail: data.image.thumbnail,
			isMp4: data.image.isMp4
		});
	}
	
	req.user.sorted.push(data.image.id);
	
	req.user.save(function(err) {
		
		if (err) { res.status(500).json({ error: "Database error." }); return; }
		
		res.json({ error: "" });
	})
});
router.post('/actions/deleteone', function(req, res) {
	
	var data;
	try { data = JSON.parse(req.body.data); }
	catch (e) { res.status(400).json({ error: "Invalid Data.", folderCount: req.user.totalFolders }); return; }
	
	if (!data.type) { res.status(400).json({ error: "Invalid Data.", folderCount: req.user.totalFolders }); return; }
	if (!data.path) { res.status(400).json({ error: "Invalid Data.", folderCount: req.user.totalFolders }); return; }
	if (data.type == "image" && (!data.image || !data.image.id)) { res.status(400).json({ error: "Invalid Data.", folderCount: req.user.totalFolders }); return; }
	
	var folderData = GetFolderInfo(data.path, req.user);
	if (folderData.error) { res.status(404).json({ error: folderData.error, folderCount: req.user.totalFolders }); return; }
	
	var unsorted;
	
	if (data.type == "folder")
	{
		folderData.parent.folders.splice(folderData.index, 1);
		var unsortData = UnsortImages(folderData.folder, req.user.sorted, 0);
		req.user.sorted = unsortData.sorted;
		req.user.markModified("sorted");
		req.user.totalFolders -= unsortData.foldersLost + 1;
		unsorted = unsortData.unsorted;
	}
	else if (data.type == "image")
	{
		var i = 0;
		
		var stopFolderLoop = false;
		var stopSortedLoop = false;
		
		for (i = 0; i < Math.max(folderData.folder.images.length, req.user.sorted.length); i++)
		{
			if (i < folderData.folder.images.length && !stopFolderLoop)
			{
				if (data.image.id == folderData.folder.images[i].id)
				{
					folderData.folder.images.splice(i, 1);
					stopFolderLoop = true;
				}
			}
			if (i < req.user.sorted.length && !stopSortedLoop)
			{
				if (data.image.id == req.user.sorted[i])
				{
					req.user.sorted.splice(i, 1);
					stopSortedLoop = true;
				}
			}
		}
		
		unsorted = [data.image];
	}
	else { res.status(400).json({ error: "Invalid Data.", folderCount: req.user.totalFolders }); return; }
	
	if (data.dontShowFolderRemove) { req.user.dontShowFolderRemove = true; }
	if (data.dontShowImageRemove) { req.user.dontShowImageRemove = true; }
	
	req.user.save(function(err, saved) {
		
		if (err) { res.status(500).json({ error: "Database error.", folderCount: req.user.totalFolders }); return; }
		
		res.json({ unsorted: unsorted, folderCount: saved.totalFolders });
	})
});



function AuthImgur(info, callback)
{
	User.findOne({ userid: info.id }, function(err, found) {

		if (err) { callback({ error: "Fail" }); return; }

		if (!found)
		{
			CreateNewUser({
				userid: info.id,
				username: info.username,
				imgurAccess: info.access,
				imgurRefresh: info.refresh,
				imgurExpiry: (new Date().getTime() + info.expiry * 1000)
			}, function(token) {

				callback({ token: token });
			}, function() {

				callback({ error: "Fail" });
			});

			return;
		}

		found.token = GenerateNewToken();
		found.imgurAccess = info.access;
		found.imgurRefresh = info.refresh;
		found.imgurExpiry = info.expiry;

		found.save(function(err2, saved) {

			if (err2) { callback({ error: "Fail" }); return; }

			callback({ token: saved.token });
		});
	});
}
function RefreshImgur(token, callback)
{
	var form = {
		
		client_id: imgurClient,
		client_secret: imgurSecret,
		grant_type: "refresh_token",
		refresh_token: token
	}
	
	request.post({
		url: 'https://api.imgur.com/oauth2/token',
		form: form
	}, function(err, response, body) {
		
		if (err) { callback({ error: err.toString() }); return; }
		
		var authData;
		try { authData = JSON.parse(body); }
		catch (e) { callback({ error: e.message }); return; }
		if (authData.error) { callback({ error: authData.error }); return; }
		
		callback({
			access: authData.access_token,
			refresh: authData.refresh_token,
			expiry: (new Date().getTime() + (authData.expires_in - 300) * 1000),
			username: authData.account_username
		});
	});
}

function GenerateNewToken()
{
	var hasher = crypto.createHash('sha1');
	hasher.update(new Date().getTime() + Math.random().toString() + salts[Math.floor(Math.random() * (salts.length - 1))]);
	return hasher.digest('hex');
}
function CreateNewUser(info, success, failure)
{
	var now = new Date().getTime();
	
	var user = new User({
		
		token: GenerateNewToken(),
		userid: info.userid,
		username: info.username,
		createdAt: now,
		imgurAccess: info.imgurAccess,
		imgurRefresh: info.imgurRefresh,
		imgurExpiry: info.imgurExpiry,
		folders: [],
		sorted: [],
		totalFolders: 0,
		dontShowFolderRemove: false,
		dontShowImageRemove: false,
		supporter: false
	});
	
	user.save(function(err, saved) {
		
		if (err) { failure(); return; }
		
		success(saved.token);
	})
}

function GetFolderInfo(path, base)
{
	var split = [];
	
	var aMode = Array.isArray(path);
	if (!aMode)
	{
		split = path.split("/");
	}
	
	var currentFolder = base;
	
	var levels = 0;
	
	for (var i = 0; i < (aMode ? path.length : split.length); i++)
	{
		if ((aMode ? path[i].safe : split[i]) == "") { return { error: "Bad Path.", status: 400 }; }
		
		var found = false;
		for (var j = 0; j < currentFolder.folders.length; j++)
		{
			if ((aMode ? path[i].safe : split[i]) == currentFolder.folders[j].safe)
			{
				if (i == (aMode ? path.length : split.length) - 1)
				{
					return { parent: currentFolder, folder: currentFolder.folders[j], index: j, levels: levels };
				}
				else
				{
					currentFolder = currentFolder.folders[j];
					levels++;
					found = true;
					break;
				}
			}
		}
		
		if (!found)
		{
			if (aMode)
			{
				var subs = path.slice(i, path.length);
				return { folder: currentFolder, levels: levels, subs: subs };
			}
			else { return { error: "Folder not found.", status: 404 }; }
		}
	}
}
function TestFolderName(name)
{
	var reg = /^[a-z0-9 ]+$/i;
	
	if (name.length == 0) { return "No Name."; }
	if (name.length < 3) { return "Name too short."; }
	if (name.length > 100) { return "Name too long."; }
	var result = reg.exec(name);
	if (result == null || result[0] != name) { return "Not alphanumeric."; }
	
	return "";
}
function TestFolderSafe(name)
{
	var reg = /^[a-z0-9_]+$/i;
	
	if (name.length == 0) { return "No Name."; }
	if (name.length < 3) { return "Name too short."; }
	if (name.length > 100) { return "Name too long."; }
	var result = reg.exec(name);
	if (result == null || result[0] != name) { return "Not alphanumeric."; }
	
	return "";
}

function UnsortImages(folder, sorted, folders)
{
	var nowUnsorted = []
	var newSorted = sorted;
	var foldersLost = folders;
	
	var i = 0;
	
	for (i = 0; i < folder.images.length; i++)
	{
		for (var j = 0; j < sorted.length; j++)
		{
			if (folder.images[i].id == sorted[j])
			{
				nowUnsorted.push(folder.images[i]);
				newSorted.splice(j, 1);
				break;
			}
		}
	}
	
	for (i = 0; i < folder.folders.length; i++)
	{
		foldersLost++;
		var unsortData = UnsortImages(folder.folders[i], newSorted, foldersLost);
		newSorted = unsortData.sorted;
		foldersLost += unsortData.foldersLost;
		nowUnsorted.concat(unsortData.unsorted);
	}
	
	return { sorted: newSorted, unsorted: nowUnsorted, foldersLost: foldersLost };
}

var salts = ["Smug Spongebob", "Javert", "Dickbutt", "Awkward Seal", "Unpopular Opinion Puffin", "Confession Bear", "Success Kid", "Hey Man You See That Guy Over There"];



module.exports = { router: router };