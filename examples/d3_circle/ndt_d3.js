window.NDTd3 = {
	'object': undefined,
	'meter': undefined,
	'arc': undefined,
	'state': undefined,
	'time_switched': undefined,
	'callbacks': {
		'onstart': NDTd3_on_start, 
		'onchange': NDTd3_on_change, 
		'onfinish': NDTd3_on_completion, 
		'onerror': NDTd3_on_error
	}
}

function NDTd3_on_pageload() {

	var width = +d3.select("#svg").style("width").replace(/px/, ""), 
		height = +d3.select("#svg").style("height").replace(/px/, ""), 
		twoPi = 2 * Math.PI;
	var innerRad = width * .3,
		outerRad = width * .36;

	var svg = d3.select("#svg").append("svg")
		.attr("width", width)
		.attr("height", height)
		.append("g")
		.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

	window.NDTd3['arc'] = d3.svg.arc()
		.startAngle(0)
		.endAngle(0)
		.innerRadius(innerRad)
		.outerRadius(outerRad);
	window.NDTd3['meter'] = svg.append("g")
		.attr("id", "progress-meter");
	window.NDTd3['meter'].append("path").attr("class", "background").attr("d", window.NDTd3['arc'].endAngle(twoPi));
	window.NDTd3['meter'].append("path").attr("class", "foreground");
	window.NDTd3['meter'].append("text")
		.attr("text-anchor", "middle")
		.attr("dy", "0em")
		.attr("class", "information")
		.text("Initializing");

	NDTd3_reset_meter();
	d3.select('text.status').text('Start Test');	
	window.NDTd3['meter'].on("click", NDTd3_on_click);
	
	d3.selectAll("#progress-meter text").classed("ready", true)
	d3.selectAll("#progress-meter .foreground").classed("complete", false)
	d3.selectAll("#progress-meter").classed("progress-error", false)

}

function NDTd3_on_start(mlab_site) {
	d3.select('text.status').text('Connecting');	
	d3.select('text.information').text('Mountain View (' + mlab_site + ')');	
}

function NDTd3_on_click() {
	window.NDTjs.ndt_coordinator();
}

function NDTd3_reset_meter() {
	d3.selectAll('#progress-meter text').remove();
	
	window.NDTd3['meter'].append("text")
		.attr("text-anchor", "middle")
		.attr("dy", "0em")
		.attr("class", "status");
	window.NDTd3['meter'].append("text")
		.attr("text-anchor", "middle")
		.attr("dy", "1.55em")
		.attr("class", "information")

	d3.select('#progress-meter').classed('progress-complete', false);
	d3.selectAll("#progress-meter text").classed("ready", true)
}

function NDTd3_on_change(returned_message) {
	var ndt_status_labels = {
		'preparing_s2c': 'Preparing Download',
		'preparing_c2s': 'Preparing Upload',
		'running_s2c': 'Measuring Download',
		'running_c2s': 'Measuring Upload',
		'finished_s2c': 'Finished Download',
		'finished_c2s': 'Finished Upload',
		'preparing_meta': 'Preparing Metadata',
		'running_meta': 'Sending Metadata',
		'finished_meta': 'Finished Metadata',
		'finished_all': 'Complete'
	}
	window.NDTd3['state'] = returned_message;
	window.NDTd3['time_switched'] = new Date().getTime();
		
	d3.select('text.status').text(ndt_status_labels[returned_message]);
	d3.timer(NDTd3_on_progress);		
}

function NDTd3_on_progress() {
	var origin = 0,
		progress = 0,
		twoPi = 2 * Math.PI,
		current_message = window.NDTd3['state'],
		time_in_progress = new Date().getTime() - window.NDTd3['time_switched'];
	
	if (current_message == "running_s2c" || current_message == "running_c2s") {
	
		if (current_message == "running_c2s" || current_message == "running_s2c") {
			progress = twoPi * (time_in_progress/10000);
		}
		else {
			window.NDTd3['time_switched'] = new Date().getTime();
			progress = 0;
		}
		
		if (current_message == "running_c2s") {
			progress = twoPi + -1 * progress					
			end_angle = window.NDTd3['arc'].endAngle(twoPi);
			start_angle = window.NDTd3['arc'].startAngle(progress);
		}
		else {
			end_angle = window.NDTd3['arc'].endAngle(progress);
			start_angle = window.NDTd3['arc'].startAngle(origin);
		}
	} 
	else if (current_message == "finished_all") {
		end_angle = window.NDTd3['arc'].endAngle(twoPi);
		start_angle = window.NDTd3['arc'].startAngle(origin);
	}
	else {
		end_angle = window.NDTd3['arc'].endAngle(origin);
		start_angle = window.NDTd3['arc'].startAngle(origin);	
	}
	d3.select('.foreground').attr("d", end_angle);
	d3.select('.foreground').attr("d", start_angle);
	
	if (current_message == 'finished_all') {
		return true;
	}
	
	return false;	
}

function NDTd3_on_completion() {
	var result_string,
		dy_offset = 1.55,
		iteration = 0,
		results = {
			'Download': 's2c_rate',
			'Upload': 'c2s_rate',
			'MinRTT': 'min_rtt'
		}
	
	for (result in results) {
		if (result != 'MinRTT') {
			result_string = Number(window.NDTjs[results[result]]/1000).toFixed(2)
			result_string += ' Mbps';
		}
		else {
			result_string = Number(window.NDTjs['web100vars'][result]).toFixed(2)
			result_string += ' ms';
		}
		dy_current = dy_offset * (iteration + 1);
		window.NDTd3['meter'].append("text")
			.attr("class", "result_value")
			.attr("text-anchor", "left")
			.attr("dy", dy_current + "em")
			.attr("dx", ".5em")
			.attr('width', '400px')
			.text(result_string)

		window.NDTd3['meter'].append("text")
			.attr("class", "result_label")
			.attr("text-anchor", "right")
			.attr("dy", dy_current + "em")
			.attr("dx", "-5em")
			.attr('width', '400px')
			.text(result)
		iteration++;
	};
	d3.selectAll("#progress-meter .foreground").classed("complete", true);
	d3.selectAll("#progress-meter text.status").attr("dy", "-50px");
	d3.selectAll("#progress-meter text.information").attr("dy", "-20px");
}

function NDTd3_on_error(error_message) {
	d3.timer.flush();
	d3.selectAll("#progress-meter").classed("progress-error", true);
	d3.select('text.status').text('Error!');
	d3.select('text.information').text(error_message);
}
