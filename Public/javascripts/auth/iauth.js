// ----------------------------------------------------- //
// ------------------- MISC UTILITY -------------------- //
// ----------------------------------------------------- //

// Gets a parameter from the URL.
function GetUrlParameter(sParam) {

	var sPageURL = decodeURIComponent(window.location.hash.substring(1)),
		sURLVariables = sPageURL.split('&'),
		sParameterName,
		i;

	for (i = 0; i < sURLVariables.length; i++) {
		sParameterName = sURLVariables[i].split('=');

		if (sParameterName[0] === sParam) {
			return sParameterName[1] === undefined ? null : sParameterName[1];
		}
	}
}

$(document).ready(function() {
	
	parseCookies();
	
	if (GetUrlParameter("error") != null)
	{
		$("#auth").html("Error!");
		$("#cont").append("<p>There was an error logging you in or linking your account. Try again later.</p>");
		
		setTimeout(function() {
			
			window.location = "/auth";
		}, 1000);
		
		return;
	}
	if (GetUrlParameter("access_token") == null ||
		GetUrlParameter("refresh_token") == null ||
		GetUrlParameter("account_username") == null ||
		GetUrlParameter("account_id") == null)
	{
		$("#auth").html("Error!");
		$("#cont").append("<p>Important data we need is missing. Try again later.</p>");
		
		setTimeout(function() {
			
			window.location = "/auth";
		}, 1000);
		
		return;
	}
	
	$.post("/auth",
	{
		access: GetUrlParameter("access_token"),
		refresh: GetUrlParameter("refresh_token"),
		expiry: GetUrlParameter("expires_in"),
		username: GetUrlParameter("account_username"),
		id: GetUrlParameter("account_id")
	}, function(res) {
		
		if (res.error)
		{
			$("#auth").html("Error!");
			$("#cont").append("<p>There was an error logging you into or linking your Mixer account. Try again later.</p>");
			return;
		}
		
		setCookie({ name: "token", newValue: res.token });
		$("#auth").html("Done!");
		
		setTimeout(function() {
			
			window.location = "/";
		}, 1000);
	});
});