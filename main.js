Array.prototype.count = function(el) {
	var n = 0;
	for(var i=0;i<this.length;i++) {
		if(this[i] === el) { n++; }
	}
	return n;
}

function Neuron(previousLayerLength) {
	this.weights = [];
	this.biases = [];
	for(var i=0;i<previousLayerLength;i++) { this.weights.push(Math.random()); this.biases.push(Math.random()); }

	this.sigmoid = function(n) {
		return Math.exp(n) / (1 + Math.exp(n));
	}

	this.dSigmoid = function(n) {
		// e^x(1 + e^x) - (e^2x) / 1 + 2e^x + e^2x
		// = e^x / 1 + 2e^x + e^2x
		return Math.exp(n) / (1 + 2 * Math.exp(n) + Math.exp(2*n));
	}

	this.activation = function(previousLayerActivations) {
		var weightedSum = 0;
		for(var i=0;i<this.weights.length;i++) {
			weightedSum += previousLayerActivations[i] * this.weights[i];
			weightedSum += this.biases[i];
		}
		return this.sigmoid(weightedSum);
	}

	this.modifyWeightsAndBiases = function(previousLayerActivations, activation, preferred) {
		// dC/dW = dC/dA * dA/dS * dS/dW = 2(A - C) * sigmoid'(wA + b) * A
		// dC/dB = dC/dA * dA/dS = 2(A - C) * sigmoid'(wA + b)
		for(var i=0;i<this.weights.length;i++) {
			this.weights[i] += 2 * (activation - preferred) * this.dSigmoid(this.weights[i] * previousLayerActivations[i] + this.biases[i]) * previousLayerActivations[i];
			this.biases[i] += 2 * (activation - preferred) * this.dSigmoid(this.weights[i] * previousLayerActivations[i] + this.biases[i]);
		}
	}
}

var

canvas,
context,

graphCanvas,
graphContext,

grid = [
	[0,0,0,0],
	[0,0,0,0],
	[0,0,0,0],
	[0,0,0,0]
],

fps = 30,

styles = [
	'rgba(238,228,218,0.35)',
	'rgb(238,228,218)',
	'rgb(237,224,200)',
	'rgb(242,177,121)',
	'rgb(245,149,99)',
	'rgb(246,124,95)',
	'rgb(246,94,59)',
	'rgb(237,207,114)',
	'rgb(237,204,97)',
	'rgb(237,200,80)',
	'rgb(237,197,63)',
	'rgb(237,194,46)'
],

previousGames = [],

outputLayer = [new Neuron(16),new Neuron(16),new Neuron(16),new Neuron(16)]
;

function importOutputLayer(json) {
	var exported = JSON.parse(json);
	for(var i=0;i<exported.length;i++) {
		outputLayer[i].weights = exported[i].w;
		outputLayer[i].biases = exported[i].b;
	}
}

function exportOutputLayer() {
	var neurons = [];
	for(var i=0;i<outputLayer.length;i++) {
		neurons.push({'w':outputLayer[i].weights,'b':outputLayer[i].biases});
	}
	return JSON.stringify(neurons);
}

function load() {
	document.getElementById('load').click();	
}

function save() {
	// https://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server
	var el = document.createElement('a');
	el.setAttribute('href','data:text/plain;charset=utf-8,' + encodeURIComponent(exportOutputLayer()));
	el.setAttribute('download','outputLayer.json');
	el.style.display = 'none';
	document.body.appendChild(el);
	el.click();
	document.body.removeChild(el);
}

function keydown(e) {
	if(e.keyCode === 32) {
		e.preventDefault();
		fps = (fps > 1) ? 1 : 30;
	}
	else if(e.keyCode === 76 || e.keyCode === 79) {
		load();
	}
	else if(e.keyCode === 83) {
		save();
	} 
}

function equal(g1,g2) {
	for(var i=0;i<g1.length;i++) {
		for(var j=0;j<g1[i].length;j++) {
			if(g1[i][j] !== g2[i][j]) { return false; }
		}
	}
	return true;
}

function spawn(grid) {
	var options = [];
	for(var i=0;i<grid.length;i++) {
		for(var j=0;j<grid[i].length;j++) {
			if(grid[i][j] === 0) {
				options.push([i,j]);
			}
		}
	}
	if(options.length > 0) {
		var opt = options[Math.floor(Math.random() * options.length)];
		grid[opt[0]][opt[1]] = (Math.random() < 0.1) ? 2 : 1;
	}
	return grid;
}

function shift(grid) {
	var n = [];
	for(var i=0;i<grid.length;i++) {
		var arr = grid[i].filter(function(v) { return v !== 0; });
		for(var j=0;j<grid[i].count(0);j++) {
			arr.push(0);
		}
		n.push(arr);
	}
	return n;
}

function left(grid) {
	var temp = grid;
	grid = shift(grid);
	for(var i=0;i<grid.length;i++) {
		for(var j=0;j<grid[i].length-1;j++) {
			if(grid[i][j] === grid[i][j+1] && grid[i][j] !== 0) {
				grid[i][j]++;
				grid[i][j+1] = 0;
			}
		}
	}
	grid = shift(grid);
	if(!equal(grid,temp)) {
		grid = spawn(grid);
	}
	return grid;
}

function rotate(grid) {
	var n = [];
	for(var i=0;i<grid.length;i++) {
		n.push([]);
		for(var j=0;j<grid[i].length;j++) {
			n[i].push(0);
			n[i][j] = grid[grid.length - j - 1][i];
		}
	}
	return n;
}

function up(grid) {
	grid = rotate(rotate(rotate(grid)));
	grid = left(grid);
	grid = rotate(grid);
	return grid;
}

function right(grid) {
	grid = rotate(rotate(grid));
	grid = left(grid);
	grid = rotate(rotate(grid));
	return grid;
}

function down(grid) {
	grid = rotate(grid);
	grid = left(grid);
	grid = rotate(rotate(rotate(grid)));
	return grid;
}

function grids(g) {
	var temp = grid;
	var options = [];
	[left,up,right,down].forEach(function(v) {
		grid = v(grid);
		options.push(grid);
		grid = temp;
	});
	return options;
}

function combine(g) {
	var n = [];
	for(var i=0;i<g.length;i++) {
		n = n.concat(g[i]);
	}
	return n;
}

function score(grid) {
	var n = [];
	for(var i=0;i<grid.length;i++) {
		n = n.concat(grid[i]);
	}

	var score = 0;
	score += Math.pow(2,Math.max.apply(null,n)) * 10;
	score += n.reduce(function(acc,cur) { return acc + Math.pow(2,cur); });
	var bound = 7;
	if(Math.max.apply(null,n) > 8) {
		bound -= (Math.max.apply(null,n) - 8);
	}
	var mul = (n.count(0) <= bound) ? 1000 : 10;
	score += grids(grid).map(function(v) { return mul * combine(v).count(0); }).reduce(function(acc,cur) { return acc + cur }) / 4;
	return score;
}

function determineCorrectMove(grid) {
	var options = [left,up,right,down].map(function(v) {
		return v(grid);
	});
	var scores = options.map(function(v) { return score(v); });
	return scores.indexOf(Math.max.apply(null,scores));
}

function update() {
	var start = new Date();

	graphContext.clearRect(0,0,graphCanvas.width,graphCanvas.height);
	graphContext.fillStyle = '#1a1a1c';
	for(var i=0;i<12;i++) {
		graphContext.fillText((i === 11) ? 0 : Math.pow(2,12-i-1),10,(i+1.5)*graphCanvas.height/16);
	}
	for(var i=0;i<20;i++) {
		var x = graphCanvas.width / 20 + (i+0.5)*graphCanvas.width/23;
		graphContext.fillText(i+1,x,11*graphCanvas.height/12);
		if(previousGames.length > i) {
			var y = ((12-previousGames[i])+0.5)*graphCanvas.height/16;
			graphContext.fillRect(x-3,y-3,6,6);
		}
	}

	var n = [];
	for(var i=0;i<grid.length;i++) { n = n.concat(grid[i]); }

	var previousLayerActivations = outputLayer.map(function(v) {
		return v.activation(n);
	});

	var maxActivationIndex = previousLayerActivations.indexOf(Math.max.apply(null,previousLayerActivations));
	var correctIndex = determineCorrectMove(grid);
	for(var i=0;i<outputLayer.length;i++) {
		outputLayer[i].modifyWeightsAndBiases(n,previousLayerActivations[i],(correctIndex === i) ? 1 : 0);
	}

	var moves = [left,up,right,down];
	var temp = grid;
	grid = moves[maxActivationIndex](grid);

	var flg = true;
	for(var i=0;i<moves.length;i++) {
		var temp = grid;
		grid = moves[i](grid);
		if(!equal(temp,grid)) { flg = false; break; }
		grid = temp;
	}
	if(flg) {
		var n = [];
		for(var i=0;i<grid.length;i++) { n = n.concat(grid[i]); }
		previousGames.push(Math.max.apply(null,n));
		if(previousGames.length > 20) {
			previousGames.shift();
		}

		grid = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
		grid = spawn(grid);
		grid = spawn(grid);
	}

	context.fillStyle = '#fff';
	context.fillRect(0,0,canvas.width,canvas.height);
	for(var i=0;i<grid.length;i++) {
		for(var j=0;j<grid[i].length;j++) {
			context.fillStyle = styles[grid[i][j]] || styles[0];
			context.fillRect((j+0.05)*canvas.width/4,(i+0.05)*canvas.height/4,0.9*canvas.width/4,0.9*canvas.height/4);
			context.fillStyle = '#1a1a1c';
			context.fillText((grid[i][j] === 0) ? '' : Math.pow(2,grid[i][j]),(j+0.5)*canvas.width/4,(i+0.5)*canvas.height/4);
		}
	}

	var end = new Date();
	var deltaTime = 1000 / fps - ((end - start) / 1000);
	setTimeout(function() {
		window.requestAnimationFrame(update);
	},deltaTime);
}

function resize() {
	canvas.width = canvas.height = Math.min(window.innerWidth,window.innerHeight);
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.font = '48px Arial';

	graphCanvas.width = window.innerWidth - Math.min(window.innerWidth,window.innerHeight);
	graphCanvas.height = window.innerHeight;

	graphContext.textAlign = 'left';
	graphContext.textBaseline = 'middle';
	graphContext.font = '12px Arial';
}

window.onload = function() {
	document.getElementById('load').onchange = function(e) {
		// https://stackoverflow.com/questions/19017010/how-to-load-a-file-locally-and-display-its-contents-using-html-javascript-withou
		var file = e.target.files[0];
		if(file) {
			var r = new FileReader();
			r.onload = function(e) {
				var json = e.target.result;
				importOutputLayer(json);
			}
			r.readAsText(file);
		}
	}

	canvas = document.getElementById('canvas');
	context = canvas.getContext('2d');
	graphCanvas = document.getElementById('learning');
	graphContext = graphCanvas.getContext('2d');
	graphContext.imageSmoothingEnabled = false;
	for(var i=0;i<2;i++){grid = spawn(grid);}
	resize();
	window.onresize = resize;
	window.onkeydown = keydown;
	update();
}
