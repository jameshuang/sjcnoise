var fnopos = 0;
var todayDate = new Date();

var noiseLoaded = false;
var noiseTable

var smssURL = "http://savemysunnysky.org";
var sjcURL = "https://complaints.bksv.com/sjc6";
var sumURL = "/southflow";
var annURL = "/announcement";
var feedbackURL = "/sendmail";
var ipURL = "/ip";
var sjc;

var gIndex = 0;
var gCount = 1;

var gCurrentUserIndex = 0;

var gBlameUserFile = "blame-user"+gCurrentUserIndex;
var gBlameUser = JSON.parse("{}");
var gBlameFlightsFile = "blame-flights"+gCurrentUserIndex;
var gBlameFlights = JSON.parse("[]");
var gName = "User0";
var gFiling = false;
var gCurrentFilingIndex = 0;
var gPreviousUserIndex = 0;
var gTotalFiledUser = 0;
var gMaxBlameLimitPerFamily = 9;
var gFilingDate; 
var gCachedSouthFlowDays = '';
// checking if firefox
var isFirefox = typeof InstallTrigger !== 'undefined';
if (isFirefox) {
  alert("Firefox is NOT supported, please use either Google Chrome, Apple Safari, or Opera instead. Redirecting to "+ smssURL);
  window.location = smssURL;
}
// Set today's date as specified by the URL parameter 'd'
d = (new URL(window.location.href)).searchParams.get('d');
dt = new Date(Date.parse(d));
if (d && dt) {
	todayDate = dt;
  gFilingDate = todayDate;
}
getAnnouncement();
adjustDateField();
getSouthFlowDays();
//load user names from local storage 
for (i = 6; i > 1; i --)
  loadUserName(i);
switchUser(1);
loadNoisePage();

function switchUser(index) {
    if(gCurrentUserIndex != 0) 
      document.getElementById("user"+gCurrentUserIndex).style.color = 'black';
    gCurrentUserIndex = index;
    gBlameUserFile = "blame-user"+gCurrentUserIndex;
    gBlameFlightsFile = "blame-flights"+gCurrentUserIndex;
    loaded = loadBlameData(index);  
    document.getElementById("user"+index).style.color = 'blue';
    document.getElementById("user"+gCurrentUserIndex).innerHTML = gName;
    report("Switched to User " + index + ": "+  gName);
    return loaded;
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


function updateFiled() {
  if (!window.gFiling) 
     return;
  window.gTotalFiledUser ++;
  if (window.gTotalFiledUser >= 6) {
    window.gFiling = false;
    window.gTotalFiledUser = 0;
    report("Done filing for family.");
    switchUser(window.gPreviousUserIndex);
  } else {
    var newIndex = window.gCurrentUserIndex + 1;
    if (newIndex == 7) 
       newIndex = 1;
    if (!switchUser(newIndex)) { 
       updateFiled();
       return;
    } else {
      selectRandom(getRandomInt(1,gMaxBlameLimitPerFamily+1));
      startComplaints();
    }
  }
}

function fileAll() {
  report("Started filing for all family members...");
  gFiling = true;
  gPreviousUserIndex = gCurrentUserIndex;
  gTotalFiledUser = 0;
  nextIndex = gCurrentUserIndex;
  selectRandom(getRandomInt(1,gMaxBlameLimitPerFamily+1));
  startComplaints(); 
}

function stopAll() {
  if (confirm("This will cancel the filing for rest family members.\n Are you sure?") == true) {
    gFiling = false;
    gTotalFiledUser = 6;
  }
}

// randomly pick at most total flights
function selectRandom(total) {
  if (total < 1)
    total = 1;
  var table = document.getElementById("target_table");
  list = getRandomN(total, table.rows.length-1);
  for (i = 0; i < list.length; i++) {
    var cb = table.rows[list[i]+1].cells[0].getElementsByTagName("input")[0];
    cb.checked = true;
  }
  return true;  
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

function getRange(m) {
 if(m>0)
   return Array.apply(null, Array(m)).map(function (_, i) {return i;});
 else
   return [];
}

function getRandomN(n, m) {
  if (n < 1)
    n = 1;
  r = getRange(m);
  if (n >= m) {
    return r; 
  }
  var myReservoir = Reservoir(n); 
  r.forEach(function(e) {
	  myReservoir.pushSome(e);
  });
  return myReservoir;
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
  if (table.rows.length <= 1)
    return 0;
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
	}
	catch (e) {
		report(e);
	}
}
function setSouthFlowDays() {
  try {
    var xhr; 
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else {
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }

    xhr.open("POST", window.sumURL);
   
    //Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function() {//Call a function when the state changes.
      if(xhr.readyState == 4 && xhr.status == 200) {
        if(xhr.responseText != '') {
          document.getElementById("south-flow-days").innerHTML =  xhr.responseText;
        }
      }
    }
    sfd = document.getElementById("set-south-flow-days").value;
    xhr.send('date='+sfd+'&total=-1');
  } catch (e) {
    report(e);
  }
}

function setAnnouncement() {
  try {
    var xhr;
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else {
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }

    xhr.open("POST", window.annURL);
  
    //Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function() {//Call a function when the state changes.
      if(xhr.readyState == 4 && xhr.status == 200) {
        if(xhr.responseText != '') {
          document.getElementById("announcement").innerHTML =  xhr.responseText;
        }
      }
    }
    ann = document.getElementById("set-announcement").value;
    pass = ann.substring(0,2);
    ann = ann.substring(2);
    xhr.send('pass='+pass+'&ann='+ann);
  } catch (e) {
    report(e);
  }
}


function getAnnouncement() {
  try {
    var xhr;
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else {
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xhr.open("GET", window.annURL);

    xhr.onreadystatechange = function() {//Call a function when the state changes.
      if(xhr.readyState == 4 && xhr.status == 200) {
        if(xhr.responseText != '') {
          document.getElementById("announcement").innerHTML = xhr.responseText;
        }
      }
    }
    xhr.send();
  } catch (e) {
    report(e);
  }
  if (!document.getElementById("ip-address"))
    return;
  try {
    var xhr;
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else {
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xhr.open("GET", window.ipURL);

    xhr.onreadystatechange = function() {//Call a function when the state changes.
      if(xhr.readyState == 4 && xhr.status == 200) {
        if(xhr.responseText != '') {
          document.getElementById("ip-address").innerHTML = xhr.responseText;
        }
      }
    }
    xhr.send();
  } catch (e) {
    report(e);
  }

}

function getSouthFlowDays() {
  try {
    var xhr;
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else {
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xhr.open("GET", window.sumURL);
   
    xhr.onreadystatechange = function() {//Call a function when the state changes.
      if(xhr.readyState == 4 && xhr.status == 200) {
        if(xhr.responseText != '') {
          gCachedSouthFlowDays = xhr.responseText;
          document.getElementById("south-flow-days").innerHTML = gCachedSouthFlowDays;
        }
      }
    }
    xhr.send();
  } catch (e) {
    report(e);
  }
}


function sum() {
  try {
    var xhr;
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else {
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xhr.open("POST", window.sumURL);
    
    //Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function() {//Call a function when the state changes.
      if(xhr.readyState == 4 && xhr.status == 200) {
        if(xhr.responseText != '') {
          document.getElementById("south-flow-days").innerHTML =  xhr.responseText;
        }
      }
    }
    xhr.send('date='+gFilingDate+'&total='+window.gCount);
  } catch (e) {
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
  var total = window.gCount.toString();
	var msg = "Done filing for " + gName + ", total ".concat(total).concat(" complaints.");
	report(msg);
  sum();
  window.setTimeout(updateFiled, 1000);
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
  var xhr;
  if (window.XMLHttpRequest) {
    xhr = new XMLHttpRequest();
  } else {
    xhr = new ActiveXObject("Microsoft.XMLHTTP");
  }

	xhr.open("POST", window.sjcURL);
	xhr.onload = function() {
		window.gCount++;
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
	return loadBlameUser(index);
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
      return true;
		} else {
      gName = "User"+index;
      return false;
    }
	} catch (e) {
		report(e);
    return false;
	}
	return true;
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
		report("You have not selected any flights to complain about.")
    updateFiled();
		return;
	}
	
	// validate contact
	if (!validateContact()) {
		report("Contact information incomplete. Abort.");
    updateFiled();
		return;
	}
	
  saveBlameUser();
	
	// Reset counter
	window.gCount = 0;
	window.gIndex = document.getElementById("target_table").rows.length - 1;
	if (window.gIndex <= 0) {
		report("There are no flight information.")
    updateFiled();
	} else {
    firstRow = document.getElementById("target_table").rows[1];
    col = firstRow.cells[1].textContent || row.cells[1].innerText;
    window.gFilingDate = col.trim().substring(0,5);
		window.fnopos = getRandomInt(0,2);
		// Load SJC complaint page
		report("Started filing complaints...");
		loadSjcPage();
	}
	
}

function toggleFeedback() {

 vis = document.getElementById("id-div-feedback").style.display;
 if (vis == "none") {
   var name = document.getElementById("form_name").value;
   var feedback_name = document.getElementById('id-feedback-name');
   if (feedback_name.value == "") {
      feedback_name.value = name;
   }
   var email = document.getElementById("form_email").value;
   var feedback_email = document.getElementById('id-feedback-email');
   if (feedback_email.value == "") {
      feedback_email.value = email;
   }
   document.getElementById("id-div-feedback").style.display = "block"
 } else {
   document.getElementById("id-div-feedback").style.display = "none";
 }
}

function checkLog() {
   if (document.getElementById('id-feedback-log').checked ) {
    var st = document.getElementById("form_status");
    var message = document.getElementById('id-feedback-message')
    message.value += ("\n\nThe History Log:\n").concat(st.value);
    message.scrollTop = message.scrollHeight;
  }
}

function sendFeedBack() {
 report('Sending feedback ...');
 toggleFeedback();
 var name = document.getElementById('id-feedback-name').value;
 var email = document.getElementById('id-feedback-email').value;
 var message = document.getElementById('id-feedback-message').value;
 //sendmail
  try {
    var xhr;
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else {
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }

    xhr.open("POST", window.feedbackURL);
  
    //Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function() {//Call a function when the state changes.
      if(xhr.readyState == 4 && xhr.status == 200) {
        if(xhr.responseText != '') {
          report(xhr.responseText);
        }
      }
    }
    xhr.send('name='+name+'&email='+email+'&message='+message);
  } catch (e) {
    report(e);
  }

 
}


// reservoir.
(function (root, factory) {
		"use strict";

		if (typeof exports === 'object') {
			module.exports = factory();
		} else if (typeof define === 'function' && define.amd) {
			define(factory);
		} else {
			root.Reservoir = factory();
		}
	}(this, function () {
		"use strict";

		// We use the same constant specified in [Vitt85]
		var switchToAlgorithmZConstant = 22;

		// `debug` was used to test for correctness of the more complicated
		// algorithms, X and Z, by comparing their results to baseline R
		var debug = "none";

		function _Reservoir(reservoirSize, randomNumberGen) {
			var rng = randomNumberGen || Math.random;

			// `reservoirSize` must be a number between 1 and 2^32
			var reservoirSize =
				Math.max(1, (Math.floor(reservoirSize) >> 0) || 1);

			// `totalItemCount` contains the total number of items 
			// processed by `pushSome` against the reservoir
			var totalItemCount = 0;

			// `numToSkip` is the total number of elements to skip over
			// before accepting one into the reservoir.
			var numToSkip = -1;

			// `currentAlgorithm` starts with algorithmX and switches to
			// algorithmZ after `switchThreshold` items is reached
			var currentAlgorithm = algorithmX;

			// `switchThreshold` is the `totalItemCount` at which to switch
			// over from algorithm X to Z
			var switchThreshold = 
				switchToAlgorithmZConstant * reservoirSize;

			if(debug === "R") {
				currentAlgorithm = algorithmR;
			} else if(debug === "X") {
				switchThreshold = Infinity;
			} else if(debug === "Z") {
				currentAlgorithm = algorithmZ;
			}

			// `algorithmXCount` is the number of items processed by algorithmX
			//  ie. the `totalItemCount` minus `reservoirSize`
			var algorithmXCount = 0;

			// `W` is used in algorithmZ
			var W = Math.exp(-Math.log(rng()) / reservoirSize);

			// `evictNext` is used only by algorithmR
			var evictNext = null;

			// `targetArray` is the array to be returned by Reservoir()
			var targetArray = [];

			targetArray.pushSome = function() {
				this.length = Math.min(this.length, reservoirSize);

				for(var i = 0; i < arguments.length; i++) {
					addSample.call(this, arguments[i]);
				}

				return this.length;
			};

			// `addSample` adds a single item at a time by using `numToSkip`
			// to determine whether to include it in the reservoir
			var addSample = function(sample) {
				// Prefill the reservoir if it isn't full
				if(totalItemCount < reservoirSize) {
					this.push(sample);
				} else {
					if(numToSkip < 0) {
						numToSkip = currentAlgorithm();
					}
					if(numToSkip === 0) {
						replaceRandomSample(sample, this);
					}
					numToSkip--;
				}
				totalItemCount++;
				return this;
			};

			// `replaceRandomSample` selects a single value from `reservoir`
			// for eviction and replaces it with `sample`
			function replaceRandomSample(sample, reservoir) {
				// Typically, the new sample replaces the "evicted" sample
				// but below we remove the evicted sample and push the
				// new value to ensure that reservoir is sorted in the
				// same order as the input data (ie. iterator or array).
				var randomIndex;
				if(evictNext !== null) {
					randomIndex = evictNext;
					evictNext = null;
				} else {
					randomIndex = Math.floor(rng() * reservoirSize);
				}
				reservoir.splice(randomIndex, 1);
				reservoir.push(sample);
			}

			// From [Vitt85], "Algorithm R"
			// Selects random elements from an unknown-length input.
			// Has a time-complexity of:
			//   O(N)
			// Number of random numbers required:
			//   N - n
			// Where:
			//   n = the size of the reservoir
			//   N = the size of the input
			function algorithmR() {
				var localItemCount = totalItemCount + 1,
				    randomValue = Math.floor(rng() * localItemCount),
				    toSkip = 0;

				while (randomValue >= reservoirSize) {
					toSkip++;
					localItemCount++;
					randomValue = Math.floor(rng() * localItemCount);
				}
				evictNext = randomValue;
				return toSkip;
			}

			// From [Vitt85], "Algorithm X"
			// Selects random elements from an unknown-length input.
			// Has a time-complexity of:
			//   O(N)
			// Number of random numbers required:
			//   2 * n * ln( N / n )
			// Where:
			//   n = the size of the reservoir
			//   N = the size of the input
			function algorithmX() {
				var localItemCount = totalItemCount,
				    randomValue = rng(),
				    toSkip = 0,
				    quotient;

				if (totalItemCount <= switchThreshold) {
					localItemCount++;
					algorithmXCount++;
					quotient = algorithmXCount / localItemCount;

					while (quotient > randomValue) {
						toSkip++;
						localItemCount++;
						algorithmXCount++;
						quotient = (quotient * algorithmXCount) / localItemCount;
					}
					return toSkip;
				} else {
					currentAlgorithm = algorithmZ;
					return currentAlgorithm();
				}
			}

			// From [Vitt85], "Algorithm Z"
			// Selects random elements from an unknown-length input.
			// Has a time-complexity of:
			//   O(n(1 + log (N / n)))
			// Number of random numbers required:
			//   2 * n * ln( N / n )
			// Where:
			//   n = the size of the reservoir
			//   N = the size of the input
			function algorithmZ() {
				var term = totalItemCount - reservoirSize + 1,
				    denom,
				    numer,
				    numer_lim;

				while(true) {
					var randomValue = rng();
					var x = totalItemCount * (W - 1);
					var toSkip = Math.floor(x);

					var subterm = ((totalItemCount + 1) / term);
					subterm *= subterm;
					var termSkip = term + toSkip;
					var lhs = Math.exp(Math.log(((randomValue * subterm) * termSkip)/ (totalItemCount + x)) / reservoirSize); 
					var rhs = (((totalItemCount + x) / termSkip) * term) / totalItemCount;

					if(lhs <= rhs) {
						W = rhs / lhs;
						break;
					}

					var y = (((randomValue * (totalItemCount + 1)) / term) * (totalItemCount + toSkip + 1)) / (totalItemCount + x);

					if(reservoirSize < toSkip) {
						denom = totalItemCount;
						numer_lim = term + toSkip;
					} else {
						denom = totalItemCount - reservoirSize + toSkip;
						numer_lim = totalItemCount + 1;
					}

					for(numer = totalItemCount + toSkip; numer >= numer_lim; numer--) {
						y = (y * numer) / denom;
						denom--;
					}

					W = Math.exp(-Math.log(rng()) / reservoirSize);

					if(Math.exp(Math.log(y) / reservoirSize) <= (totalItemCount + x) / totalItemCount) {
						break;
					}
				}
				return toSkip;
			}
			return targetArray;
		}

		return _Reservoir;

		// REFERENCES
		// [Vitt85] Vitter, Jeffery S. "Random Sampling with a Reservoir." ACM
		//          Transactions on Mathematical Software, Vol. 11, No. 1, March
		//          1985, pp. 37-57. Retrieved from
		//          http://www.cs.umd.edu/~samir/498/vitter.pdf
}));
