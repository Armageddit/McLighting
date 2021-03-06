(function($){
$(function(){
	  
	// Settings
	var host = window.location.hostname;
	//host = "esp8266_02.local";

	var ws_url = 'ws://' + host + ':81';
	var connection;
	var ws_waiting = 0;

	// ******************************************************************
	// Side navigation
	// ******************************************************************
    $('.button-collapse').sideNav();
	
	// Navlinks
	$('#mc-nav').on('click', '.mc-navlink', function(){
		console.log("Navigate to pane: ", $(this).data("pane"));
		showPane($(this).data("pane"));
	});
	
	function showPane(pane) {
		$('.mc_pane').addClass('hide');
		$('#' + pane).removeClass('hide');
		$('.button-collapse').sideNav('hide');
		
		//if (pane == "pane2") {
		//	setMainColor();
		//}
	}
	
	
	// ******************************************************************
	// init()
	// ******************************************************************
	function init() {
		console.log("Connection websockets to:", ws_url);
		connection = new WebSocket(ws_url, ['arduino']);
		var mode = 0;
		var ws2812fx_mode = 0;
		$.getJSON("http://" + host + "/status", function(data) {
		    console.log("status", data);
			mode  = data.mode;
			ws2812fx_mode = data.ws2812fx_mode;
		    $("#rng_delay").val(data.speed);
			$("#rng_brightness").val(data.brightness);
			$("#rng_white").val(data.color[0]);	
			$("#rng_red").val(data.color[1]);
			$("#rng_green").val(data.color[2]);
			$("#rng_blue").val(data.color[3]);
			var statusColor = "#" + componentToHex(data.color[1]) + componentToHex(data.color[2]) + componentToHex(data.color[3]);
			$('#status').css("backgroundColor", statusColor);
			$('#status_color').text(statusColor + "- R=" + data.color[1] + ", G=" + data.color[2] + ", B=" + data.color[3]);
		});

		// Load modes async
		// List of all color modes
		//   enum MODE {OFF, AUTO, TV, E131, SET_MODE, HOLD, CUSTOM, SETCOLOR, SETSPEED, BRIGHTNESS, WIPE, RAINBOW, RAINBOWCYCLE, THEATERCHASE, TWINKLERANDOM, THEATERCHASERAINBOW};
		$.getJSON("http://" + host + "/get_modes", function(data) {
		    console.log("modes", data);
			var modes_html = "";
			data.forEach(function(current_mode){
				if (current_mode.mode !== undefined) {
					modes_html += '<div class="col s12 m6 l6 btn_grid">'; 
					if ((mode == "5" && current_mode.mode == ws2812fx_mode) || (mode == "0" && current_mode.mode == "off") || (mode == "2" && current_mode.mode == "tv") || (mode == "3" && current_mode.mode == "e131")){
						modes_html += '<a class="btn waves-effect waves-light btn_mode red" name="action" data-mode="' + current_mode.mode + '">(' + current_mode.mode +') '+ current_mode.name; 					
					} else {
						modes_html += '<a class="btn waves-effect waves-light btn_mode blue" name="action" data-mode="' + current_mode.mode + '">(' + current_mode.mode +') '+ current_mode.name; 
					}
					modes_html += '<i class="material-icons right">send</i>';
					modes_html += '</a>';
					modes_html += '</div>';
				}
			});
			
			$('#modes').html(modes_html);
		});
		// When the connection is open, send some data to the server
		connection.onopen = function () {
			//connection.send('Ping'); // Send the message 'Ping' to the server
			console.log('WebSocket Open');
			showPane('pane1');
		};

		// Log errors
		connection.onerror = function (error) {
			console.log('WebSocket Error ' + error);
			$('#mc-wsloader').addClass('hide');
			$('#mc-wserror').removeClass('hide');
		};

		// Log messages from the server
		connection.onmessage = function (e) {
			console.log('WebSocket from server: ' + e.data);
			ws_waiting = 0;
		};
	}

	
	// ******************************************************************
	// Modes
	// ******************************************************************	
	$("#pane2").on("click", ".btn_mode", function() {
		var mode = $(this).attr("data-mode");
		last_mode = mode;
		var btn = $(this);
		setMode(mode, function() {
			$(".btn_mode, .btn_mode_static").removeClass("red").addClass("blue");
			btn.removeClass("blue").addClass("red");
		});
	});	
	
	$("#pane2").on("click", ".btn_mode_static", function() {
		var mode = $(this).attr("data-mode");
		var btn = $(this);
		
		wsSendCommand("=" + mode);
		$(".btn_mode, .btn_mode_static").removeClass("red").addClass("blue");
		btn.removeClass("blue").addClass("red");
	});
	
	$("#pane2").on("change", ".update_colors", setMainColor);	
	
	$("#pane2").on("change", ".update_delay", function() {
		var delay = $("#rng_delay").val();		
		
		wsSendCommand("?" + delay);
	});
	
	$("#pane2").on("change", ".update_brightness", function() {
		var brightness = $("#rng_brightness").val();		
		
		wsSendCommand("%" + brightness);
	});

	$("#autoSwitch").on("change", function () {
		if ($(this).prop('checked')) {
			wsSendCommand("start");
		} else {
			wsSendCommand("stop");
		}
	}); 
	
	function setMode(mode, finish_funtion) {
		console.log("Mode: ", mode);

		wsSendCommand("/" + mode);
		finish_funtion();
	}
	
	function setMainColor() {
		var white = $("#rng_white").val();	
		var red = $("#rng_red").val();
		var green = $("#rng_green").val();
		var blue = $("#rng_blue").val();
		
		var hexColor = componentToHex(white) + componentToHex(red) + componentToHex(green) + componentToHex(blue);
		var statusColor = "#" + componentToHex(red) + componentToHex(green) + componentToHex(blue);
		wsSetMainColor(hexColor);
		$('#status').css("backgroundColor", statusColor);
		$('#status_color').text(statusColor + "- R=" + red + ", G=" + green + ", B=" + blue);
	}
	
	
	// ******************************************************************
	// WebSocket commands
	// ******************************************************************
	function wsSendCommand(cmd) {
		console.log("Send WebSocket command:", cmd);
		if (ws_waiting == 0)  {
			connection.send(cmd);
			ws_waiting++;
		} else {
			console.log("++++++++ WS call waiting, skip")
		}
	}	
	
	
	function wsSetAll(hexColor) {
		console.log("wsSetAll() Set all colors to:", hexColor);
		wsSendCommand("*" + hexColor);
	}
	
	function wsSetMainColor(hexColor) {
		console.log("wsSetMainColor() Set main colors to:", hexColor);
		wsSendCommand("#" + hexColor);
	}
	
	
	
	// ******************************************************************
	// Colorwheel
	// ******************************************************************
	// this is supposed to work on mobiles (touch) as well as on a desktop (click)
	// since we couldn't find a decent one .. this try of writing one by myself
	// + google. swiping would be really nice - I will possibly implement it with
	// jquery later - or never.

	var canvas = document.getElementById("myCanvas");
	// FIX: Cancel touch end event and handle click via touchstart
	// canvas.addEventListener("touchend", function(e) { e.preventDefault(); }, false);
	canvas.addEventListener("touchmove", doTouch, false);
	canvas.addEventListener("click", doClick, false);
	//canvas.addEventListener("mousemove", doClick, false);

	
	var context = canvas.getContext('2d');
	var centerX = canvas.width / 2;
	var centerY = canvas.height / 2;
	var innerRadius = canvas.width / 4.5;
	var outerRadius = (canvas.width - 10) / 2

	//outer border
	context.beginPath();
	//outer circle
	context.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI, false);
	//draw the outer border: (gets drawn around the circle!)
	context.lineWidth = 4;
	context.strokeStyle = '#000000';
	context.stroke();
	context.closePath();

	//fill with beautiful colors 
	//taken from here: http://stackoverflow.com/questions/18265804/building-a-color-wheel-in-html5
	for(var angle=0; angle<=360; angle+=1) {
		var startAngle = (angle-2)*Math.PI/180;
		var endAngle = angle * Math.PI/180;
		context.beginPath();
		context.moveTo(centerX, centerY);
		context.arc(centerX, centerY, outerRadius, startAngle, endAngle, false);
		context.closePath();
		context.fillStyle = 'hsl('+angle+', 100%, 50%)';
		context.fill();
		context.closePath();
	}

	//inner border
	context.beginPath();
	//context.arc(centerX, centerY, radius, startAngle, endAngle, counterClockwise);
	context.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI, false);
	//fill the center
	var my_gradient=context.createLinearGradient(0,0,170,0);
	my_gradient.addColorStop(0,"black");
	my_gradient.addColorStop(1,"white");
	
	context.fillStyle = my_gradient;
	context.fillStyle = "white";
	context.fill();

	//draw the inner line
	context.lineWidth = 2;
	context.strokeStyle = '#000000';
	context.stroke();
	context.closePath();

	//get Mouse x/y canvas position
	function getMousePos(canvas, evt) {
		var rect = canvas.getBoundingClientRect();
		return {
			x: evt.clientX - rect.left,
			y: evt.clientY - rect.top
		};
	}

	//comp to Hex
	function componentToHex(c) {
		//var hex = c.toString(16);
		//return hex.length == 1 ? "0" + hex : hex;
		return  ("0"+(Number(c).toString(16))).slice(-2).toUpperCase();
	}

	//rgb/rgba to Hex
	function rgbToHex(rgb) {
		return componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
	}

	//display the touch/click position and color info
	function updateStatus(pos, color) {
		//var hexColor = rgbToHex(color);
		//wsSetAll(hexColor);
		var hexColor = componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2]);
		wsSetMainColor(hexColor);
		hexColor = "#" + hexColor;
		
		$('#status').css("backgroundColor", hexColor);
		$('#status_color').text(hexColor + " - R=" + color[0] + ", G=" + color[1] + ", B=" + color[2]);
		$('#status_pos').text("x: " + pos.x + " - y: " + pos.y);
		
		$("#rng_white").val(0);
		$("#rng_red").val(color[0]);
		$("#rng_green").val(color[1]);
		$("#rng_blue").val(color[2]);
	}

	//handle the touch event
	function doTouch(event) {
		//to not also fire on click
		event.preventDefault();
		var el = event.target;
		
		//touch position
		var pos = {x: Math.round(event.targetTouches[0].pageX - el.offsetLeft),
				   y: Math.round(event.targetTouches[0].pageY - el.offsetTop)};
		//color
		var color = context.getImageData(pos.x, pos.y, 1, 1).data;

		updateStatus(pos, color);
	}

	function doClick(event) {   
		//click position   
		var pos = getMousePos(canvas, event);
		//color
		var color = context.getImageData(pos.x, pos.y, 1, 1).data;
		
		//console.log("click", pos.x, pos.y, color);
		updateStatus(pos, color);
		
		//now do sth with the color rgbToHex(color);
		//don't do stuff when #000000 (outside circle and lines
	}


	// ******************************************************************
	// main
	// ******************************************************************
	init();
	
}); // end of document ready
})(jQuery); // end of jQuery name space