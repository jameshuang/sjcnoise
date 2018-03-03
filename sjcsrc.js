var fnopos = 0;
var todayDate = new Date();

var noiseLoaded = false;
var noiseTable

var sjcURL = "https://complaints.bksv.com/sjc6";
var sjc;

var gIndex = 0;
var gCount = 0;

var gCurrentUserIndex = 0;

var gBlameUserFile = "blame-user"+gCurrentUserIndex;
var gBlameUser = JSON.parse("{}");
var gBlameFlightsFile = "blame-flights"+gCurrentUserIndex;
var gBlameFlights = JSON.parse("[]");
var gName = "User0";
// Set today's date as specified by the URL parameter 'd'
d = (new URL(window.location.href)).searchParams.get('d');
dt = new Date(Date.parse(d));
if (d && dt) {
	todayDate = dt;
}

adjustDateField();
//load user names from local storage 
for (i = 6; i > 0; i --)
  loadUserName(i);
switchUser(1);
loadNoisePage();

function switchUser(index) {
    if(gCurrentUserIndex != 0) 
      document.getElementById("user"+gCurrentUserIndex).style.color = 'black';
    gCurrentUserIndex = index;
    gBlameUserFile = "blame-user"+gCurrentUserIndex;
    gBlameFlightsFile = "blame-flights"+gCurrentUserIndex;
    loadBlameData(index);  
    document.getElementById("user"+index).style.color = 'blue';
    report("Filing for user "+index+": "+gName);
    document.getElementById("user"+gCurrentUserIndex).innerHTML = gName;
}

// clear all saved user info, together with all the filed flights info
function clearUsers() {
  if (confirm("This will clear all saved info for all users of this website.\n Are you sure?") == true) { 
    for(i = 1; i<7; i++)
       clearUser(i); 
  }
}

function clearCurrentUser() {
   if (confirm("This will clear all saved info for " + gName + " from this website.\n Are you sure?") == true) {
    clearUser(gCurrentUserIndex);
   }
}

// clear the saved user info, together with the filed flights info
function clearUser(index) {
  var userFile = "blame-user" + index;
  var flightsFile = "blame-flights" + index;
  var user = localStorage.getItem(userFile);
  if (user) { 
    localStorage.removeItem(userFile);
    document.getElementById("user"+gCurrentUserIndex).innerHTML = "User"+index;
    if(gCurrentUserIndex == index) {
      gName = "User"+index;
      gBlameUser = JSON.parse("{}");
      gBlameFlights = JSON.parse("[]");
      resetForm();    
    }
  }
  var flights = localStorage.getItem(flightsFile);
  if (flights) 
    localStorage.removeItem(flightsFile); 
}

// clear current form part
function resetForm() {
  document.getElementById("form_comments").value = "";
  document.getElementById("form_name").value = "";
  document.getElementById("form_surname").value = "";
  document.getElementById("form_address1").value = "";
  document.getElementById("form_city").value = "Sunnyvale";
  document.getElementById("form_state").value = "CA";
  document.getElementById("form_zipcode").value = "";
  document.getElementById("form_homephone").value = "";
  document.getElementById("form_workphone").value = "";
  document.getElementById("form_cellphone").value = "";
  document.getElementById("form_email").value = ""; 
}

function adjustDateField()
{
	var d = window.todayDate;
	document.getElementById('option_today').innerHTML = d.toLocaleDateString().concat(" (Today)");
	document.getElementById('option_today').value = toYmdStr(d);
	d.setDate(d.getDate() - 1);
	document.getElementById('option_yesterday').innerHTML = d.toLocaleDateString().concat(" (Yesterday)");
	document.getElementById('option_yesterday').value = toYmdStr(d);
	var form_date_select = document.getElementById('form_date');
	for (i = 0; i < 28; i++) {
		d.setDate(d.getDate() - 1);
		form_date_select.options[form_date_select.options.length] = new Option(d.toLocaleDateString(), toYmdStr(d));
	}
}

function checkAddress()
{
}

function toYmdStr(d)	// Tom date format: 2017/6/8
{
	return d.getFullYear().toString().concat("/").concat((d.getMonth() + 1).toString()).concat("/").concat(d.getDate().toString());
}

function validateContact()
{
	var name = document.getElementById('form_name').value;
	var surname = document.getElementById('form_surname').value;
	var zipcode = document.getElementById('form_zipcode').value;
	var address1 = document.getElementById('form_address1').value;

	if (!name.length || !surname.length || !zipcode.length || !address1.length) {
		return false;
	}
	return true;
}

function validate(field)
{
	if (field == "form_altitude") {
		var alt = parseInt(document.getElementById("form_altitude").value, 10);
		if (!alt) {
			document.getElementById("form_altitude").value = "5000";
		}
		else if (alt < 1000) {
			document.getElementById("form_altitude").value = "1000";
		}
		else if (alt > 8000) {
			document.getElementById("form_altitude").value = "8000";
		}
		refreshTargetTable();
	}
	else if (field == "form_limit") {
		var limit = parseInt(document.getElementById("form_limit").value, 10);
		if (!limit) {
			document.getElementById("form_limit").value = "20";
		}
		else if (limit < 1) {
			document.getElementById("form_limit").value = "1";
		}
		else if (limit > 50) {
			document.getElementById("form_limit").value = "50";
		}
		refreshTargetTable();
	}
	else if (field == "form_timetype") {
		var tt = document.getElementById("form_timetype").value;
		if (tt == "any") {
			document.getElementById("form_timex").style.visibility = "hidden";
			document.getElementById("form_timey").style.visibility = "hidden";
		}
		else if (tt == "before" || tt == "after") {
			document.getElementById("form_timex").style.visibility = "visible";
			document.getElementById("form_timey").style.visibility = "hidden";
			if (tt == "after") {
				document.getElementById("form_timex").value = "22";
			}
			else {
				document.getElementById("form_timex").value = "8";
			}
		}
		else if (tt == "btw" || tt == "notbtw") {
			document.getElementById("form_timex").style.visibility = "visible";
			document.getElementById("form_timey").style.visibility = "visible";
			document.getElementById("form_timex").value = "8";
			document.getElementById("form_timey").value = "22";
		}
		refreshTargetTable();
	}
}

function selectAll()
{
	var sa = document.getElementById("form_selectall");
	var table = document.getElementById("target_table");
	for (var i = 1, r; r = table.rows[i]; i++) {
		var cb = r.cells[0].getElementsByTagName("input")[0];
		cb.checked = sa.checked;
	}
	return true;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

/* Timestamp format: mm/dd/yyyy hh:mm AM|PM */
function parseTimestamp(ts)
{
	var arr = [];
	var date_re = /^(0[1-9]|1[0-2])\/(0[1-9]|1\d|2\d|3[01])\/(20)\d{2}$/;
	var time_re = /^(0[1-9]|1[0-2]):([0-5][0-9])$/;
	
	var date_time_am = ts.split(" ");
	// Date
	if (!date_time_am[0]) return arr;
	if (!(date_re.test(date_time_am[0]))) {
		return arr;
	}	
	var dmy = date_time_am[0].split("/");
	var month = dmy[0];
	var day = dmy[1];
	var year = dmy[2];
	if (!day || !month || !year) return arr;
	
	// Time
	if (!date_time_am[1]) return arr;
	if (!(time_re.test(date_time_am[1]))) {
		//alert(date_time_am[1]);
		return arr;
	}
	var hm = date_time_am[1].split(":");
	var hour = hm[0];
	var min = hm[1];
	if (!hour || !min) return arr;
	
	// AM/PM
	var am = date_time_am[2];
	if (!am) return arr;
	am = am.toLowerCase();
	if (am !== "am" && am !== "pm") return arr;
	
	arr["month"] = month;
	arr["day"] = day;
	arr["year"] = year;
	arr["hour"] = hour;
	arr["min"] = min;
	arr["am"] = am;
//	alert(arr["month"].concat("/").concat(arr["day"]).concat("/").concat(arr["year"]));
	return arr;
}

function getSjcTsArr(tsArr)
{
	var arr = [];
	arr["month"] = parseInt(tsArr["month"], 10);
	arr["day"] = parseInt(tsArr["day"], 10);
	arr["year"] = parseInt(tsArr["year"], 10);
	arr["hour"] = parseInt(tsArr["hour"], 10);
	arr["min"] = parseInt(tsArr["min"], 10);
	if (tsArr["am"] == "am") {
		arr["am"] = true;
	}
	else {
		arr["am"] = false;
	}
	
	var res = [];
	res["month"] = arr["month"].toString();
	res["day"] = arr["day"].toString();
	res["year"] = arr["year"].toString();
	if (arr["am"]) {
		if (arr["hour"] == 12) {
			res["hour"] = 0;
		}
		else {
			res["hour"] = arr["hour"].toString();
		}
	}
	else if (arr["hour"] == 12) {
		res["hour"] = "12";
	}
	else {
		res["hour"] = (arr["hour"] + 12).toString();
	}
	var mx = getRandomInt(-1,2);
	var my = mx + arr["min"];
	if (my < 0 || my > 59) my = arr["min"];
	res["min"] = my.toString();

	//alert(res["month"].concat("/").concat(res["day"]).concat("/").concat(res["year"]));
	return res;
}

/// Noise flights page
function loadNoisePage()
{
	var noise;
	
	if (window.XMLHttpRequest) {
		noise = new XMLHttpRequest();
	}
	else {
		noise = new ActiveXObject("Microsoft.XMLHTTP");
	}
	var noiseURL = "/plane_list/".concat(document.getElementById("form_date").value);
	try
	{
		noise.open("GET", noiseURL);
		noise.onload = function() {
			/////////////////////
			/* This does not work on Firefox, which does not support document.write */
			/*
			var noiseDoc = document.implementation.createHTMLDocument();
			noiseDoc.open();
			noiseDoc.write(noise.response);
			noiseDoc.close();
			window.noiseTable = noiseDoc.getElementsByTagName("table")[0];
			*/
			
			var tab = document.createElement("table");
			tab.hidden = true;
			var i = noise.response.indexOf("<table>") + 7;
			var j = noise.response.indexOf("</table>");
			tab.innerHTML = noise.response.substring(i, j);
			window.noiseTable = tab;
			//////////////////////////
			
			window.noiseLoaded = true;
			//window.gIndex = window.noiseTable.rows.length - 1;
			report("Fetched flights.")
			//loadSjcPage();
			refreshTargetTable();
		}
		noise.onerror = function() {
			report("Failed to fetch flights. Abort!")
		}
		report("Fetching flights...")
		noise.send();
	}
	catch (e) {
		report(e);
	}
}

function countSelectedFlight()
{
	var table = document.getElementById("target_table");
	var count = 0;
	for (var i = 0, r; r = table.rows[i]; i++) {
		var cb = r.cells[0].getElementsByTagName("input")[0];
		if (cb.checked) {
			count++;
		}
	}
	return count;
}

function refreshTargetTable()
{
	if (!window.noiseTable) return;
	var limit = parseInt(document.getElementById("form_limit").value, 10);
	var table = document.getElementById("target_table");
	table.innerHTML = "";
	var i = window.noiseTable.rows.length - 1;
	for (var r; i >= 0 && (r = window.noiseTable.rows[i]); i--) {
		if (i > 0 && !filter(r)) continue;
		var row = table.insertRow(0);
		var cb = document.createElement("input");
		cb.type = "checkbox";
		cb.value = "no";
		if (i == 0) {
			cb.id = "form_selectall";
			cb.addEventListener('click', function() { selectAll(); });
		}
		/*else {
			row.insertCell(0).innerHTML = "Select";
		}*/
		row.insertCell(0).appendChild(cb);
		row.insertCell(1).innerHTML = r.cells[0].innerHTML;
		row.insertCell(2).innerHTML = r.cells[6].innerHTML;
		row.insertCell(3).innerHTML = r.cells[1].innerHTML;
		row.insertCell(4).innerHTML = r.cells[2].innerHTML;
		row.insertCell(5).innerHTML = r.cells[3].innerHTML;
		row.insertCell(6).innerHTML = r.cells[4].innerHTML;
		//row.insertCell(6).innerHTML = r.cells[5].innerHTML;
		//row.insertCell(6).innerHTML = r.cells[6].innerHTML;
		row.insertCell(7).innerHTML = r.cells[11].innerHTML;
		if (i > 0) {
			var path = row.insertCell(8);
			path.innerHTML = r.cells[13].innerHTML;
			var a = path.getElementsByTagName("a")[0];
			a.setAttribute("href", "http://45.79.109.108".concat(a.getAttribute("href")));
		}
		else {
			row.insertCell(8).innerHTML = "Flight Path";
		}
		if (i && table.rows[limit-1]) i = 1;
	}
	if (!table.rows[1]) {
		var row = table.insertRow(-1);
		table.innerHTML = "<tr><td>There are no flights meeting the criteria!</td></tr>";
	}
	return;
}

function loadSjcPage()
{
	if (window.XMLHttpRequest) {
		window.sjc = new XMLHttpRequest();
	}
	else {
		window.sjc = new ActiveXObject("Microsoft.XMLHTTP");
	}

	//alert("loading sjc page ...")
	try
	{
		window.sjc.open("GET", window.sjcURL);
		window.sjc.onload = complainSjcFlight;
		window.sjc.onerror = function() {
			report("Failed to fetch SJC page. Abort!")
		}
		window.sjc.send();
		//alert("sent request");
	}
	catch (e) {
		report(e);
	}
}

function report(msg)
{
	var st = document.getElementById("form_status");
	st.value += ("\n").concat(msg);
	st.scrollTop = st.scrollHeight;
	return;
}

function fini()
{
	var msg = "Done. You filed ".concat(gCount.toString()).concat(" complaints.");
	report(msg);
	return;
}

function filter(row)
{
	var col;
	
	//airport
	col = row.cells[4].textContent || row.cells[4].innerText
	var airport = col.replace(/\r?\n|\n/g, "").trim();
	if (airport !== "KSJC" && airport !== "SJC") {
		return false;
	}

	//alt
	col = row.cells[6].textContent || row.cells[6].innerText
	col = col.replace(/\r?\n|\n/g, "").trim();
	var alt = parseInt(col, 10);
	if (alt >= parseInt(document.getElementById("form_altitude").value, 10)) {
		return false;
	}
	
	//ts
	col = row.cells[0].textContent || row.cells[0].innerText
	var flightTime = col.replace(/\r?\n|\n/g, "").trim();
	var tsArr = parseTimestamp(flightTime);
	sjcTsArr = getSjcTsArr(tsArr);
	var flightId = tsArr["day"].concat(tsArr["hour"]).concat(tsArr["min"]).concat(tsArr["am"]);
	try {
		if (window.gBlameFlights && window.gBlameFlights.indexOf(flightId) >= 0) {
			return false;
		}
	}
	catch (e) {
		report(e);
	}
	
	var h = parseInt(sjcTsArr["hour"], 10);
	var hx = parseInt(document.getElementById("form_timex").value, 10);
	var hy = parseInt(document.getElementById("form_timey").value, 10);
	var tt = document.getElementById("form_timetype").value;
	if ((tt == "before" && h >= hx)
	|| (tt == "after" && h < hx)
	|| (tt == "btw" && (h < hx || h >= hy))
	|| (tt == "notbtw" && (h >= hx && h < hy))) {
		return false;
	}
	
	return true;
}

/// Complain
function complainSjcFlight()
{
	var sjcTsArr;
	var flightTime;
	var flightId;
	var flightNum;
	while (true) {
		if (window.gIndex <= 0) {
			fini();
			return; // Reached the top of the noise table
		}
		var table = document.getElementById("target_table");
		var row = table.rows[window.gIndex--];
		//select
		var cb = row.cells[0].getElementsByTagName("input")[0];
		if (!cb.checked) {
			continue;
		}
		
		//airport
		var col = row.cells[6].textContent || row.cells[6].innerText
		var airport = col.replace(/\r?\n|\n/g, "").trim();
		if (airport !== "KSJC" && airport !== "SJC") {
			continue;
		}
		//alt
		col = row.cells[2].textContent || row.cells[2].innerText
		col = col.replace(/\r?\n|\n/g, "").trim();
		var alt = parseInt(col, 10);
		if (alt >= parseInt(document.getElementById("form_altitude").value, 10)) {
			continue;
		}
		//ts
		col = row.cells[1].textContent || row.cells[1].innerText
		flightTime = col.replace(/\r?\n|\n/g, "").trim();
		var tsArr = parseTimestamp(flightTime);
		sjcTsArr = getSjcTsArr(tsArr);
		flightId = tsArr["day"].concat(tsArr["hour"]).concat(tsArr["min"]).concat(tsArr["am"]);
		if (window.gBlameFlights && window.gBlameFlights.indexOf(flightId) >= 0) {
			continue;
		}
		var h = parseInt(sjcTsArr["hour"], 10);
		var hx = parseInt(document.getElementById("form_timex").value, 10);
		var hy = parseInt(document.getElementById("form_timey").value, 10);
		var tt = document.getElementById("form_timetype").value;
		if ((tt == "before" && h >= hx)
		|| (tt == "after" && h < hx)
		|| (tt == "btw" && (h < hx || h >= hy))
		|| (tt == "notbtw" && (h >= hx && h < hy))) {
			continue;
		}
		//flight num
		flightNum = row.cells[3].textContent || row.cells[3].innerText;
		flightNum = flightNum.replace(/\r?\n|\n/g, "").trim();
		break;
	}

	var doc = document.implementation.createHTMLDocument();
	doc.open();
	doc.write(window.sjc.response);
  doc.close();
  
	doc.getElementById("form_month").value = sjcTsArr["month"];
	doc.getElementById("form_day").value = sjcTsArr["day"];
	doc.getElementById("form_year").value = sjcTsArr["year"];
	doc.getElementById("form_hour").value = sjcTsArr["hour"];
	doc.getElementById("form_min").value = sjcTsArr["min"];
	doc.getElementById("form_aircrafttype").value = "Commercial Jet";
	doc.getElementById("form_responserequired").value = "Y";
	
	var comment = window.gBlameUser.form_comments;
	if (flightNum.length > 0) {
		if (window.fnopos == 0) {
			comment = flightNum.concat(". ").concat(comment);
		}
		else {
			comment = comment.concat(" ").concat(flightNum);
		}
	}
	doc.getElementById("form_comments").value = comment;
	
	doc.getElementById("form_name").value = window.gBlameUser.form_name;
	doc.getElementById("form_surname").value = window.gBlameUser.form_surname;
	doc.getElementById("form_address1").value = window.gBlameUser.form_address1;
	doc.getElementById("form_city").value = window.gBlameUser.form_city;
	doc.getElementById("form_state").value = window.gBlameUser.form_state;
	doc.getElementById("form_zipcode").value = window.gBlameUser.form_zipcode;
	doc.getElementById("form_homephone").value = window.gBlameUser.form_homephone;
	doc.getElementById("form_workphone").value = window.gBlameUser.form_workphone;
	doc.getElementById("form_cellphone").value = window.gBlameUser.form_cellphone;
	doc.getElementById("form_email").value = window.gBlameUser.form_email;
	
	/*
	doc.onload = reportSucc;
	doc.onerror = reportFail;
	// SJC form's button is named as 'submit'.
	//doc.getElementById("form").submit();
	///document.createElement('form').submit.call(document.getElementById("form"));
	//doc.getElementById("submit").onclick();
	var elem = doc.getElementById("form").submit;
	if (typeof elem.onclick == "function") {
		elem.onclick.apply(elem);
	}	
	alert("submitted");
	*/
	
	
	/// Retrieving form data from a form
	/// https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects
	
	var formData = new FormData(doc.getElementById("form"));
	var xhr = new XMLHttpRequest();
	xhr.open("POST", window.sjcURL);
	xhr.onload = function() {
		window.gCount++;
    //alert(JSON.stringify(window.gBlameFlights));
    if (typeof(window.gBlameFlights) == 'undefined' || window.gBlameFlights == null) {
			window.gBlameFlights = JSON.parse("[]");
		}
		window.gBlameFlights.push(flightId);
		saveBlameFlights();
		report(flightTime);
		//if (window.gCount >= parseInt(document.getElementById("form_limit").value, 10)) {
		if (window.gCount >= 10) {
			fini();
		}
		else {
			setTimeout(loadSjcPage, getRandomInt(15,30) * 1000);
		}
	}
	xhr.onerror = function() {
		report(flightTimme.concat(" (error!)"));
		setTimeout(loadSjcPage, getRandomInt(15,30) * 1000);
	}
	xhr.send(formData);	
}

function loadCountPage()
{
	var x = new XMLHttpRequest();
	var u = "ht".concat("tps:/").concat("/jam").concat("eshuang").concat(".github.io").concat("/blamesjc").concat("/count.html");
	try {
		x.open("GET", u);
		x.onload = function() {}
		x.onerror = function() {}
		x.send();
	}
	catch (e) {
		report(e);
	}
}

function saveBlameData()
{
	saveBlameUser();
	saveBlameFlights();
	return;
}

function saveBlameUser()
{
	var obj = JSON.parse("{}");
	obj.form_comments = document.getElementById("form_comments").value;
	obj.form_name = document.getElementById("form_name").value;
	obj.form_surname = document.getElementById("form_surname").value;
	obj.form_address1 = document.getElementById("form_address1").value;
	obj.form_city = document.getElementById("form_city").value;
	obj.form_state = document.getElementById("form_state").value;
	obj.form_zipcode = document.getElementById("form_zipcode").value;
	obj.form_homephone = document.getElementById("form_homephone").value;
	obj.form_workphone = document.getElementById("form_workphone").value;
	obj.form_cellphone = document.getElementById("form_cellphone").value;
	obj.form_email = document.getElementById("form_email").value;
	obj.form_altitude = document.getElementById("form_altitude").value;
	obj.form_timetype = document.getElementById("form_timetype").value;
	obj.form_timex = document.getElementById("form_timex").value;
	obj.form_timey = document.getElementById("form_timey").value;
	
	var text = JSON.stringify(obj);

	localStorage.setItem(gBlameUserFile, text);
	window.gBlameUser = obj;
	return;
}

function saveBlameFlights()
{
	var text = JSON.stringify(window.gBlameFlights);
	localStorage.setItem(gBlameFlightsFile, text);
	return;
}

function loadBlameData(index)
{
  loadBlameFlights();
  loadBlameUser(index);
	return;
}

function loadUserName(index) {
  var userFile = "blame-user" + index;
  try {
    var text = localStorage.getItem(userFile);
    var obj = JSON.parse(text);
    if (obj) {
     document.getElementById("user" + index).innerHTML = obj.form_name;
    }
  } catch (e) {
      report(e);
  }
  return;
}

function loadBlameUser(index)
{
	try {
		var text = localStorage.getItem(gBlameUserFile);
		var obj = JSON.parse(text);
		if (obj) {
			document.getElementById("form_comments").value = obj.form_comments;
			document.getElementById("form_name").value = obj.form_name;
			document.getElementById("form_surname").value = obj.form_surname;
      gName = obj.form_name; //memorize it for report
			document.getElementById("form_address1").value = obj.form_address1;
			document.getElementById("form_city").value = obj.form_city;
			document.getElementById("form_state").value = obj.form_state;
			document.getElementById("form_zipcode").value = obj.form_zipcode;
			document.getElementById("form_homephone").value = obj.form_homephone;
			document.getElementById("form_workphone").value = obj.form_workphone;
			document.getElementById("form_cellphone").value = obj.form_cellphone;
			document.getElementById("form_email").value = obj.form_email;
			if (obj.form_altitude) document.getElementById("form_altitude").value = obj.form_altitude;
			if (obj.form_timex) document.getElementById("form_timex").value = obj.form_timex;
			if (obj.form_timey) document.getElementById("form_timey").value = obj.form_timey;
			if (obj.form_timetype) {
				document.getElementById("form_timetype").value = obj.form_timetype;
				validate("form_timetype");
			}
			gBlameUser = obj;
		} else {
      gName = "User"+index;
    }
	} catch (e) {
		report(e);
	}
	return;
}

function loadBlameFlights()
{
	window.gBlameFlights = JSON.parse("[]");
	try {
		var text = localStorage.getItem(gBlameFlightsFile);

		var list = JSON.parse(text);
		if (list && list.length > 1000) {
			list.splice(0, list.length - 1000);
		}
    window.gBlameFlights = list;
	} catch (e) {
		report(e);
	}
	return;
}

function startComplaints()
{
	if (!countSelectedFlight()) {
		alert("You have not selected any flights to complain about.")
		return;
	}
	
	// validate contact
	if (!validateContact()) {
		report("Contact information incomplete. Abort.");
		return;
	}
	
	// Check profile
	//...
	saveBlameUser();

	/*
	// Check if CORS is disabled
	if (!window.noiseLoaded) {
		alert("It seems that you have not turned on the CORS extension. Please refer to the following page to turn it on then reload this page.");
		return;
	}
	*/
	
	// Reset counter
	window.gCount = 0;
	window.gIndex = document.getElementById("target_table").rows.length - 1;
	if (window.gIndex <= 0) {
		alert("There are no flight information.")
	}
	else {
		window.fnopos = getRandomInt(0,2);
		// Load SJC complaint page
		report("Started filing complaints...");
		loadSjcPage();
	}
	
	//alert("loading sjc...");
	
	//loadNoisePage();
}
