(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
		(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/main.js','ga');

ga('create', 'UA-87986189-1', 'auto');
ga('send', 'pageview');

document.body.onload = function () {
	var donation_key = document.getElementById("donation_key");
	if (donation_key) {
		var value = donation_key.value;
		donation_key.addEventListener("blur", function () {
			donation_key.value = value;
		});
	}
};