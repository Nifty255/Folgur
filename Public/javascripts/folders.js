var token = "";
var folders;
var sorted;
var folderCount;
var unsorted = [];
var coverQueue = [];
var skipped = [];
var path = [ { name: "Root Folder", safe: "", folders: [], images: [] } ];
var favoritesPage = 0;
var sortingShown = false;
var editingFolder = false;
var removeObject;
var statusTimer = null;
var awaitingRequest = false;
var awaitingInterval = false;
var hitLastPage = false;

function StatusWork(text) {
	
	$("#status").css("color", "white").text(text);
	
	if (statusTimer != null) { clearTimeout(statusTimer); }
}

function StatusSuccess(text) {
	
	$("#status").css("color", "#40b76b").text(text);
	
	if (statusTimer != null) { clearTimeout(statusTimer); }
	statusTimer = setTimeout(function() {
		
		$("#status").html("&nbsp;");
		statusTimer = null;
	}, 3000);
}

function StatusCaution(text) {
	
	$("#status").css("color", "#dbb133").text(text);
	
	if (statusTimer != null) { clearTimeout(statusTimer); }
	statusTimer = setTimeout(function() {
		
		$("#status").html("&nbsp;");
		statusTimer = null;
	}, 3000);
}

function StatusError(text) {
	
	$("#status").css("color", "#db3535").text(text);
	
	if (statusTimer != null) { clearTimeout(statusTimer); }
	statusTimer = setTimeout(function() {
		
		$("#status").html("&nbsp;");
		statusTimer = null;
	}, 3000);
}

function GetThumbnail(id) {
	
	return "https://i.imgur.com/" + id + "m.jpg";
}

function GetFolderPath() {
	
	var toRet = "";
	
	for (var i = 1; i < path.length; i++)
	{
		toRet += path[i].safe + "/";
	}
	
	return toRet;
}

function RenderFolder() {
	
	var currentFolder = path[path.length - 1];
	
	var newList = "";
	var i = 0;

	for (i = 0; i < currentFolder.folders.length; i++)
	{
		newList += '<li class="folder" data-index="' + i.toString() + '" data-folder="' + currentFolder.folders[i].safe + '">';
		newList += '<img class="licon" src="/images/folder.png">';
		newList += '<label class="lname">' + currentFolder.folders[i].name + '</label>';
		newList += '<span class="linfo">' + currentFolder.folders[i].folders.length.toString() + ' folder' + (currentFolder.folders[i].folders.length != 1 ? 's' : '') + ', ' + currentFolder.folders[i].images.length.toString() + ' image' + (currentFolder.folders[i].images.length != 1 ? 's' : '') + '</span>';
		newList += '<img class="licon remove" src="/images/remove.png">';
		newList += '</li>';
	}
	
	for (i = 0; i < currentFolder.images.length; i++)
	{
		newList += '<li class="image" data-index="' + i.toString() + '" data-image=\'' + JSON.stringify(currentFolder.images[i]) + '\'>';
		newList += '<img class="licon" src="/images/favorite.png">';
		newList += '<label class="lname">' + currentFolder.images[i].name + '</label>';
		newList += '<span class="linfo"><a href="' + currentFolder.images[i].link + '" target="_blank">Open Favorite</a> | <a class="acopy" data-link="' + currentFolder.images[i].link + '">Copy Link</a></span>';
		newList += '<img class="licon remove" src="/images/remove.png">';
		newList += '</li>';
	}
	
	newList += '<li class="add">';
	newList += '<img class="licon add" src="/images/add.png">';
	newList += '<label class="lname">Add Folder</label>';
	newList += '<span class="linfo">New folders are not saved until a favorite has been placed inside them.</span>';
	newList += '</li>';
	
	if (path.length > 1)
	{
		newList += '<li class="back">';
		newList += '<img class="licon back" src="/images/back.png">';
		newList += '<label class="lname">Go Back</label>';
		newList += '</li>';
	}
	
	var pathText = "/";
	
	for (i = 1; i < path.length; i++)
	{
		pathText += path[i].name + "/";
	}
	
	$("#foldertitle").html(currentFolder.name + ":");
	$("#folderpath").html(pathText);
	$(".folderlist").html(newList);
}

function GetFavorites(auto) {
	
	$.ajax({
		url: "https://api.imgur.com/3/account/" + username + "/favorites/" + favoritesPage.toString(),
		method: "GET",
		beforeSend: function(xhr) {

			xhr.setRequestHeader("Accept", "application/json");
			xhr.setRequestHeader("Authorization", "Bearer " + access);
		},
		success: function(data) {
			
			if (data.data.length == 0) { hitLastPage = true; return; }

			for (var i = 0; i < data.data.length; i++)
			{
				var dontAdd = false;
				for (var j = 0; j < sorted.length; j++)
				{
					if (data.data[i].id == sorted[j])
					{
						sorted.splice(j, 1);
						dontAdd = true;
						break;
					}
				}

				if (!dontAdd)
				{
					if (data.data[i].is_album)
					{
						if (data.data[i].images_count == 1)
						{
							unsorted.push({
								
								id: data.data[i].images[0].id,
								title: data.data[i].title,
								thumbnail: "https://i.imgur.com/" + data.data[i].images[0].id + "m.jpg",
								link: data.data[i].images[0].gifv || data.data[i].images[0].link,
								isMp4: (data.data[i].images[0].mp4 ? true : false)
							});
						}
						else
						{
							unsorted.push({ id: data.data[i].id, title: data.data[i].title, link: data.data[i].link, isMp4: false, imageCount: data.data[i].images_count });
							coverQueue.push({ id: data.data[i].cover, albumId: data.data[i].id });
						}
					}
					else
					{
						unsorted.push({

							id: data.data[i].id,
							title: data.data[i].title,
							thumbnail: "https://i.imgur.com/" + data.data[i].id + "m.jpg",
							link: data.data[i].gifv || data.data[i].link,
							isMp4: (data.data[i].mp4 ? true : false)
						});
					}
				}
			}
		},
		error: function(data, status) { 
			
			console.log("Error! Imgur is over capacity. Try again later.");
		}
	});
}

function RenderSorting() {
	
	var i = 0;
	
	$(".card").each(function() {
		
		RenderToCard($(this), i);
		i++;
	});
	
	$("#loading-unsorted").css("display", "none");
	$("#pane-unsorted").css("display", "");
}
function RenderToCard(card, index) { 
	
	var cardData = "";
	
	cardData += '<input type="text" class="cardnimput" placeholder="Name (or leave blank)">';
	cardData += '<div class="cardthumbcont" data-preview="' + unsorted[index].link + '" data-album="' + (unsorted[index].imageCount > 1 ? "true" : "false") + '" data-mp4="' + (unsorted[index].isMp4 ? "true" : "false") + '">';
	cardData += '<span class="cardthumbhlpr"></span>';
	cardData += '<img class="cardthumb" src="' + unsorted[index].thumbnail + '">';
	if (unsorted[index].imageCount > 1) { cardData += '<span class="thumboverlay">' + unsorted[index].imageCount.toString() + '</span>'; }
	cardData += '</div>';
	cardData += '<div class="cardtitlecont"><span class="cardtitle">' + unsorted[index].title + '</span></div>';
	
	card.html(cardData);
}

function StartStuff() {
	
	parseCookies();
	
	token = getCookie("token", "");
	
	RenderFolder();
	
	$(".folderlist").on("dblclick", "li.folder", function(e) {
		
		e.preventDefault();
		
		if (awaitingRequest) { StatusCaution("Please wait..."); return; }
		if ($(this).hasClass("edit")) { StatusCaution("You can't enter a folder you're editing."); return; }
		
		var currentFolder = path[path.length - 1];
		
		path.push(currentFolder.folders[parseInt($(this).attr("data-index"))]);
		
		RenderFolder();
	});
	
	$(".folderlist").on("clicl", "a.acopy", function(e) {
		
		$("#linkcopy").val($(this).attr("data-link")).select();
		document.execCommand("copy");
		
		StatusSuccess("Link copied!");
	});
	
	$(".folderlist").on("click", "li.back", function() {
		
		if (awaitingRequest) { StatusCaution("Please wait..."); return; }
		
		path.splice(path.length - 1, 1);
		
		RenderFolder();
	});
	
	$(".folderlist").on("click", "li.add", function() {
		
		if (awaitingRequest) { StatusCaution("Please wait..."); return; }
		
		if (editingFolder) { StatusCaution("You're already adding a folder."); return; }
		
		if (folderCount >= 50) { StatusCaution("You may only create 50 folders."); return; }
		if (path.length >= 6) { StatusCaution("You may only nest folders 5 levels deep."); return; }
		
		editingFolder = true;
		
		var currentFolder = path[path.length - 1];
		
		var newFolderText = "";
		
		newFolderText += '<li class="folder edit" data-index="' + currentFolder.folders.length.toString() + '">';
		newFolderText += '<img class="licon" src="/images/folder.png">';
		newFolderText += '<input type="text" class="name-input">';
		newFolderText += '<span class="linfo">Name your new folder.</span>';
		newFolderText += '<img class="licon cancel" src="/images/cancel.png">';
		newFolderText += '<img class="licon check" src="/images/check.png">';
		newFolderText += '</li>';
		
		$(newFolderText).insertBefore("li.add");
		
		$(".folder.edit .name-input").focus();
	});
	
	$(".folderlist").on("input", ".name-input", function() {
		
		var test = TestFolderName($(this).val());
		
		if (test != "") { $(this).parent().children(".linfo").css("color", "#db3535").text(test); }
		else { $(this).parent().children(".linfo").css("color", "").text("Name your new folder."); }
	});
	
	$(".folderlist").on("keyup", ".name-input", function (e) {
		
		if (e.which == 13)
		{
			$(this).parent().children(".check").click();
		}
	});
	
	$(".folderlist").on("click", ".check", function() {
		
		if (awaitingRequest) { StatusCaution("Please wait..."); return; }
		
		var currentFolder = path[path.length - 1];
		
		var name = $(this).parent().children(".name-input").val();
		
		var newFolder = {
			name: name,
			safe: name.replace(/ /g, "_"),
			folders: [],
			images: []
		};
		
		for (var i = 0; i < currentFolder.folders.length; i++)
		{
			if (currentFolder.folders[i].safe == newFolder.safe)
			{
				$(this).parent().children(".linfo").css("color", "#db3535").text("Couldn't create folder. It already exists!");
				return;
			}
		}
		
		$(this).parent().removeClass("edit");
		
		currentFolder.folders.push(newFolder);
		path.push(newFolder);
		editingFolder = false;
		
		RenderFolder();
	});
	
	$(".folderlist").on("click", ".cancel", function() {
		
		if (awaitingRequest) { StatusCaution("Please wait..."); return; }
		
		$(this).parent().remove();
		editingFolder = false;
	});
	
	$(".folderlist").on("click", ".folder .remove", function() {
		
		if (awaitingRequest) { StatusCaution("Please wait..."); return; }
		
		removeObject = { type: "folder", path: GetFolderPath() + $(this).parent().attr("data-folder") };
		$("#delete-folder").css("display", "block");
		$("#delete-image").css("display", "none");
		
		if (dontShowFolderRemove) { $("#delete-confirm").click(); }
		else { $("#delete-modal").modal("show"); }
	});
	
	$(".folderlist").on("click", ".image .remove", function() {
		
		if (awaitingRequest) { StatusCaution("Please wait..."); return; }
		
		var pathString = GetFolderPath();
		removeObject = { type: "image", path: pathString.substring(0, pathString.length - 1), image: JSON.parse($(this).parent().attr("data-image")) };
		$("#delete-folder").css("display", "none");
		$("#delete-image").css("display", "block");
		
		if (dontShowImageRemove) { $("#delete-confirm").click(); }
		else { $("#delete-modal").modal("show"); }
	});
	
	$("#delete-confirm").click(function() {
		
		if (awaitingRequest) { StatusCaution("Please wait..."); return; }
		
		StatusWork("Deleting...");
		
		removeObject.dontShowFolderRemove = $("#dont-warn-folder").prop("checked");
		removeObject.dontShowImageRemove = $("#dont-warn-image").prop("checked");
		
		dontShowFolderRemove = removeObject.dontShowFolderRemove;
		dontShowImageRemove = removeObject.dontShowImageRemove;
		
		$.ajax({
			
			url: "/actions/deleteone",
			method: "POST",
			data: { token: token, data: JSON.stringify(removeObject) },
			complete: function(data) {
				
				var response = data.responseJSON;
				
				if (response.error && response.error != "Folder not found.")
				{
					StatusError("We couldn't delete that " + removeObject.type + " at this time. Try again later. Error: " + response.error);
					return;
				}
				
				var currentFolder = path[path.length - 1];
				
				folderCount = response.folderCount;
				
				var lastFolder = removeObject.path.split("/");
				lastFolder = lastFolder[lastFolder.length - 1];
				
				var element = $("li[data-" + removeObject.type + "='" + (removeObject.type == "folder" ? lastFolder : JSON.stringify(removeObject.image)) + "']");
				
				currentFolder[removeObject.type + "s"].splice(parseInt(element.attr("data-index")), 1);
				
				element.nextAll("." + removeObject.type).each(function() {

					$(this).attr("data-index", (parseInt($(this).attr("data-index")) - 1).toString());
				});
				
				element.remove();
				
				if (!response.error) { unsorted.concat(response.unsorted); }
				
				StatusSuccess("Deleted!");
			}
		});
	});
	
	
	
	$(".cardcont").on("click", ".cardthumbcont", function() {
		
		var previewData = "";
		var url = $(this).attr("data-preview");
		var isMp4 = ($(this).attr("data-mp4") == "true");
		var isAlbum = ($(this).attr("data-album") == "true");
		
		if (isAlbum) { window.open(url); return; }
		
		if (isMp4) { previewData += '<video class="preview" src="' + url.substring(0, url.length - 4) + 'mp4" autoplay loop>'; }
		else { previewData += '<img class="preview" src="' + url + '">'; }
		
		$("#preview-body").html(previewData);
		
		$("#preview-modal").modal('show');
	});
	
	
	
	$("#skip").click(function() {
		
		if (awaitingRequest) { StatusCaution("Please wait..."); return; }
		
		awaitingRequest = true;
		
		if (unsorted[0].isAlbum)
		{
			coverQueue.splice(0, 1);
		}
		
		skipped.push(unsorted[0]);
		unsorted.splice(0, 1);
		
		for (var i = 0; i < coverQueue.length; i++)
		{
			coverQueue[i].index--;
		}
		
		$(".card:first").animate({ opacity: 0 }, 125, function() {
			
			var thisCard = $(this);
			setTimeout(function() {
				
				thisCard.remove();
				
				if (unsorted.length > 3)
				{
					var nextCard = $('<div class="card"></div>').appendTo(".cardcont");
					RenderToCard(nextCard, 3);
				}
				
				if ($(".card").length == 0)
				{
					$(".pane-unsorted").css("display", "");
					$(".nomore-unsorted").css("display", "");
				}
				
				awaitingRequest = false;
			}, 125);
		});
	});
	
	$("#save").click(function() {
		
		if (awaitingRequest) { StatusCaution("Please wait..."); return; }
		
		awaitingRequest = true;
		
		var currentFolder = path[path.length - 1];
		
		var thisFavorite = unsorted[0];
		var name = $(".card:first .cardnimput").val();
		thisFavorite.name = (name != "" ? name : thisFavorite.title);
		
		if (name.length > 250) { StatusCaution("The name must be less than 250 characters."); awaitingRequest = false; return; }
		if (path.length == 1) { StatusCaution("You can't save favorites to the Root Folder."); awaitingRequest = false; return; }
		
		StatusWork("Saving...");
		
		var pathToSend = [];
		
		var i = 0;
		
		for (i = 1; i < path.length; i++)
		{
			pathToSend.push({ name: path[i].name, safe: path[i].safe });
		}
		
		var data = { path: pathToSend, image: thisFavorite };
		
		$.ajax({
			
			url: "/actions/addimg",
			method: "POST",
			data: { token: token, data: JSON.stringify(data) },
			success: function(response) {
				
				if (unsorted[0].isAlbum)
				{
					coverQueue.splice(0, 1);
				}

				currentFolder.images.push(unsorted[0]);
				unsorted.splice(0, 1);

				for (i = 0; i < coverQueue.length; i++)
				{
					coverQueue[i].index--;
				}
				
				$(".card:first").animate({ opacity: 0 }, 125, function() {
					
					var thisCard = $(this);
					setTimeout(function() {
						
						thisCard.remove();
						
						if (unsorted.length > 3)
						{
							var nextCard = $('<div class="card"></div>').appendTo(".cardcont");
							RenderToCard(nextCard, 3);
						}
						
						StatusSuccess("Saved!");
						
						var newImage = "";

						newImage += '<li class="image" data-index="' + currentFolder.images.length + '" data-image=\'' + JSON.stringify(thisFavorite) + '\'>';
						newImage += '<img class="licon" src="/images/favorite.png">';
						newImage += '<label class="lname">' + thisFavorite.name + '</label>';
						newImage += '<span class="linfo"><a href="' + thisFavorite.link + '" target="_blank">Open Favorite</a> | <a class="acopy" data-link="' + thisFavorite.link + '">Copy Link</a></span>';
						newImage += '<img class="licon remove" src="/images/remove.png">';
						newImage += '</li>';

						$(newImage).insertBefore("li.add");
						
						setTimeout(function() {
							
							$("li.image:last").animate({ transform: "scale(1.25)" }, 125, "linear", function() {
								
								$("li.image:last").animate({ transform: "scale(1)" }, 125, "linear");
								
								 awaitingRequest = false;
							});
						}, 125);
						
						awaitingRequest = false;
					}, 125);
				});
			},
			error: function(data) {
				
				if (data.responseJSON.error) { StatusError(data.responseJSON.error); awaitingRequest = false; return; }
			}
		});
	});
	
	GetFavorites(false);
	
	setInterval(function() {
		
		if (awaitingInterval) { return; }
		
		// Get more unsorted if needed.
		if (unsorted.length < 10 && !hitLastPage)
		{
			favoritesPage++;
			GetFavorites(true);
		}
		
		// Loop iterator init.
		var i = 0;
		
		// Shows Sorting Pane when ready.
		if (!sortingShown && (unsorted.length >= 10 || hitLastPage))
		{
			var ready = true;
			for (i = 0; i < Math.min(unsorted.length, 3); i++)
			{
				if (!unsorted[i].id) { ready = false; break; }
			}

			if (ready) { RenderSorting(); sortingShown = true; }
		}
		
		// Gets album information.
		for (i = 0; i < Math.min(coverQueue.length, 5); i++)
		{
			if (!coverQueue[i].loaded)
			{
				var thisId = coverQueue[i].albumId;
				awaitingInterval = true;
				
				$.ajax({
					url: "https://api.imgur.com/3/image/" + coverQueue[i].id,
					method: "GET",
					beforeSend: function(xhr) {

						xhr.setRequestHeader("Accept", "application/json");
						xhr.setRequestHeader("Authorization", "Client-ID " + client);
					},
					success: function(data) {
						
						for (var j = 0; j < coverQueue.length; j++)
						{
							if (coverQueue[j].albumId == thisId)
							{
								coverQueue[j].loaded = true;
								
								for (var k = 0; k < unsorted.length; k++)
								{
									if (unsorted.id == thisId)
									{
										unsorted[k].thumbnail = "https://i.imgur.com/" + coverQueue[j].id + "m.jpg";
										awaitingInterval = false;
										break;
									}
								}
								break;
							}
						}
						
					},
					error: function(data) {
						
						awaitingInterval = false;
					} 
				});
				
				break;
			}
		}
	}, 500);
}

$(document).ready(function() {
	
	$.get("/folders", function(res) {
		
		if (res.error) { StatusError("Error! " + res.error); }
		
		var data = JSON.parse(res.payload);
		
		folders = data.folders;
		sorted = data.sorted;
		folderCount = data.count;
		
		path[0].folders = folders;
		
		StartStuff();
	});
});

// TODO: Handle empty folders, whether they're saved or not.