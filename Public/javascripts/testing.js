function TestFolderName(name) {
	
	var reg = /^[a-z0-9 ]+$/i;
	
	if (name.length == 0) { return "Name your new folder."; }
	if (name.length < 3) { return "Folder name too short."; }
	if (name.length > 100) { return "Folder name too long."; }
	var result = reg.exec(name);
	if (result == null || result[0] != name) { return "Name must be A-Z, 0-9, or space."; }
	
	return "";
}