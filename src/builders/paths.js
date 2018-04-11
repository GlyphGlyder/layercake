/**
 * Contains the bulk of the code used for taking svg path elements and converting
 * them into a 3D object.
 */

export default {

	make: function(paths, offset, layer, layers) {

		let meshes = [];
		// This is the formula for a path command.  Every path begins with a
		// letter, followed by at least one positive or negative digit which may
		// or may not have a decimal.  In some instances there's more than one
		// "point", in which case additional numbers may follow after a comma,
		// space, or negative sign as their seperator.
		//let pathCommandRegex = /([a-zA-Z](\-?\d+(\.\d+)?(([\s\,\-])*\d+(\.\d+)?)*)?)/g;

		let letterRegex = "[a-zA-Z]";

		let firstNumberDecimalFront = "\\d*\\.\\d+"
		let firstNumberDecimalBack = "\\d+(\\.\\d+)?"
		let firstNumber = "(\\-?(" + firstNumberDecimalFront + "|" + firstNumberDecimalBack +"))?";

		let subsequentNumberCommaSpace = "[\\s\\,]" + firstNumber;
		let subsequentNumberNegative = "\\-(" + firstNumberDecimalFront + "|" + firstNumberDecimalBack + ")";
		let subsequentNumberDecimal = "\\.\\d+";
		let subsequentNumbers = "(" +
			subsequentNumberCommaSpace + "|" +
			subsequentNumberNegative + "|" +
			subsequentNumberDecimal + ")";

		let pathCommandRegex = new RegExp("(" + letterRegex + firstNumber + subsequentNumbers + "*)", 'g');

		let color = "#000000";

		// Possible one of the hardest, as this entails a lot of regexp parsing
		for(var i = 0; i < paths.length; i ++) {

			// First, we only want the actual path data, so let's get that.
			let pathRegExp = paths[i].match(/d="([^"]*)"/);
			let pathData = "";
			if (pathRegExp.length >= 2) {
				pathData = pathRegExp[1];
			}

			// Then, we're going to grab every single substring that begins with
			// a letter and contains an unlimited number of digits and commas.
			// The delimiter for every path command is going to be a letter
			let pathCommands = pathData.match(pathCommandRegex);

			// Now, let's go ahead and create a new Threejs shape and analyze each
			// point command individually to turn it into a command we can apply
			// to our shape
			let shape = new THREE.Shape();
			let currentTarget = shape;
			let lastCommand = {};
			for(var j = 0; j < pathCommands.length; j ++) {

				if (pathCommands[j] == "Z" || pathCommands[j] == "z") {
					// Okay, this is tricky.  Basically though, a Z in the middle
					// indicates we're cutting holes in the path.  If currentTarget
					// == shape, then we simply assign a new Path object to
					// currentTarget.  Otherwise, we're going to add currentTarget to
					// shape's "holes" and add yet another path
					if (currentTarget !== shape) {
						shape.holes.push(currentTarget);
					}
					let oldX = currentTarget.firstPoint.x;
					let oldY = currentTarget.firstPoint.y;
					currentTarget = new THREE.Path();
					currentTarget.moveTo(oldX, oldY);

					lastCommand = {letter: "Z"};

				} else {
					lastCommand = shapeCommand(currentTarget, pathCommands[j], lastCommand, offset);
					console.log(lastCommand);
				}

			}

			// Great, we have a shape.  You likely still need to give it a color
			// though.  Extract that real fast.
			let colorMatch = paths[i].match(/style="(.)*fill:(#[a-f0-9]{0,6})(.)*"/i);
			if (colorMatch != null && colorMatch.length > 3) {
				// Capture, going to be the second capture group
				color = colorMatch[2];
			}

			// After all of the above is said and done, you'll have your very own
			// shape.  Now to turn it into a geometry
			let geometry = new THREE.ExtrudeGeometry(shape, {
				amount: 5,
				bevelSize: 0,
				bevelThickness: 0
			});
			let material = new THREE.MeshBasicMaterial( {color } );
			let mesh = new THREE.Mesh(geometry, material);

			// You might have to translate it.  Check to see.
			let translateMatch = paths[i].match(/transform="translate\((\-?\d+(\.\d+)?) (\-?\d+(\.\d+)?)\)"/);
			if (translateMatch) {
				mesh.position.x += parseFloat(translateMatch[1]);
				mesh.position.y -= parseFloat(translateMatch[3]);
			}

			if (layer !== undefined && layers !== undefined) {
				mesh.position.z = layers * 5 - layer * 5;
			}


			meshes.push(mesh);
		}

		return meshes;

	}

}

/**
 * Handles Arc commands.  I still don't know the math behind this, truth be
 * told.
 * https://github.com/mrdoob/three.js/blob/master/examples/webgl_geometry_extrude_shapes2.html
 */
var arcCommand = function(shape, points, offset, relative) {

	var radiusX = parseFloat(points[0]);
	var radiusY = parseFloat(points[1]);
	var xAngle = parseFloat(points[2]);
	var laf = (parseInt(points[3]) === 1);
	var sf = (parseInt(points[4]) === 1);

	let nx = 0;
	let ny = 0;
	if (relative) {
		// A relative command.  We're going to take the easy way out and adjust
		// those relative points to absolute points
		nx = shape.currentPoint.x + parseFloat(points[5]);
		ny = shape.currentPoint.y - parseFloat(points[6]);
	} else {
		// Much easier
		nx = parseFloat(points[5]) - offset.x;
		ny = offset.y - parseFloat(points[6]);
	}

	var x = shape.currentPoint.x;
	var y = shape.currentPoint.y;

	// Calculate the start of the ar
	var x1 = Math.cos( xAngle ) * ( x - nx ) / 2 + Math.sin( xAngle ) * ( y - ny ) / 2;
	var y1 = - Math.sin( xAngle ) * ( x - nx ) / 2 + Math.cos( xAngle ) * ( y - ny ) / 2;

	// Fuck this shit
	// https://en.wikipedia.org/wiki/Norm_(mathematics)
	var norm = Math.sqrt( ( radiusX * radiusX * radiusY * radiusY - radiusX * radiusX * y1 * y1 - radiusY * radiusY * x1 * x1 ) /
					 ( radiusX * radiusX * y1 * y1 + radiusY * radiusY * x1 * x1 ) );

	// This was causing some weird bullshit.  Getting rid of it.
	// Mind you, this code is half a decade old.
	if ( sf !== laf ) norm = - norm;

	// Then calculate the end of the arc
	var x2 = norm * radiusX * y1 / radiusY;
	var y2 = norm * -radiusY * x1 / radiusX;

	// Calculate the center
	var centerX = Math.cos( xAngle ) * x2 - Math.sin( xAngle ) * y2 + ( x + nx ) / 2;
	var centerY = Math.sin( xAngle ) * x2 + Math.cos( xAngle ) * y2 + ( y + ny ) / 2;

	var u = new THREE.Vector2( 1, 0 );
	var v = new THREE.Vector2( ( x1 - x2 ) / radiusX, ( y1 - y2 ) / radiusY );

	var startAng = Math.acos( u.dot( v ) / u.length() / v.length() );

	if ( ( ( u.x * v.y ) - ( u.y * v.x ) ) < 0 ) startAng = - startAng;

	u.x = ( - x1 - x2 ) / radiusX;
	u.y = ( - y1 - y2 ) / radiusY;

	var deltaAng = Math.acos( v.dot( u ) / v.length() / u.length() );

	if ( ( ( v.x * u.y ) - ( v.y * u.x ) ) < 0 ) deltaAng = - deltaAng;
	if ( ! sf && deltaAng > 0 ) deltaAng -= Math.PI * 2;
	if ( sf && deltaAng < 0 ) deltaAng += Math.PI * 2;

	shape.absarc(centerX, centerY, radiusX, startAng, startAng + deltaAng, sf);

	// It's implicitly assumed that anytime there's more than the standard number
	// of points then the next set of points is another arc command.  Thus, if
	// the point length is greater than 7, call arcCommand again.
	if (points.length > 7) {
		arcCommand(shape, points.slice(7), offset, relative);
	}
}

/**
 * Takes an SVG curve command (C or c) and calls the bezierCurveTo method on shape
 * @param shape: shape to apply changes to
 * @param points: points used in the command
 * @param offset
 * @param relative: is this a relative command or absolute command?
 */
var curveCommand = function(shape, points, offset, relative) {

	if (relative) {
		shape.bezierCurveTo(
			shape.currentPoint.x + parseFloat(points[0]),
			shape.currentPoint.y - parseFloat(points[1]),
			shape.currentPoint.x + parseFloat(points[2]),
			shape.currentPoint.y - parseFloat(points[3]),
			shape.currentPoint.x + parseFloat(points[4]),
			shape.currentPoint.y - parseFloat(points[5])
		);
		return;
	}

	shape.bezierCurveTo(
		parseFloat(points[0]) - offset.x,
		offset.y - parseFloat(points[1]),
		parseFloat(points[2]) - offset.x,
		offset.y - parseFloat(points[3]),
		parseFloat(points[4]) - offset.x,
		offset.y - parseFloat(points[5])
	);
}

var lineCommand = function(shape, points, offset, relative) {

	if (points.length == 2) {

		if (relative) {
			shape.lineTo(
				shape.currentPoint.x + parseFloat(points[0]),
				shape.currentPoint.y - parseFloat(points[1])
			);
			return;
		}

		shape.lineTo(
			parseFloat(points[0]) - offset.x,
			offset.y - parseFloat(points[1])
		);

	}
}

/**
 * Helper function.  Used to handle SVG move commands.  Calls the moveTo method
 * on the shape.
 */
var moveCommand = function(shape, points, offset, relative) {

	if (points.length == 2) {

		if (relative) {
			shape.moveTo(
				shape.currentPoint.x + parseFloat(points[0]),
				shape.currentPoint.y - parseFloat(points[1])
			);
			return;
		}

		shape.moveTo(
			parseFloat(points[0]) - offset.x,
			offset.y - parseFloat(points[1])
		);

	}

}

/**
 * Helper function.  Used to handle SVG Q commands, which are used to create
 * quadratic curves.
 * @param shape
 * @param points
 * @param offset
 * @param relative
 */
var quadraticCommand = function(shape, points, offset, relative) {

	if (relative) {
		shape.quadraticCurveTo(
			shape.currentPoint.x + parseFloat(points[0]),
			shape.currentPoint.y - parseFloat(points[1]),
			shape.currentPoint.x + parseFloat(points[2]),
			shape.currentPoint.y - parseFloat(points[3])
		);
		return;
	}

	shape.quadraticCurveTo(
		parseFloat(points[0]) - offset.x,
		offset.y - parseFloat(points[1]),
		parseFloat(points[2]) - offset.x,
		offset.y - parseFloat(points[3])
	);

}


/**
 * Takes some SVG path command string, breaks it down, then uses a switch to
 * figure out what to do next.
 * @param shape: a threejs shape or threejs path object.  Depending on what
 *	the particular path command is, this function will call a method on this
 *	object to gradually built it into some sort of shape.
 * @param command: the particular command snippet taken from the full path
 *	string
 * @param lastPoints: some commands (I'm looking at you S and T) require an
 *	awareness of the points that the last command used.
 * @param offset: an x,y coordinate pair, necessary since svg shapes are
 *	positioned relative to the top left whereas threejs uses a scene graph.
 * @return the last command, handily turned into an object with a letter attribute
 *	containing the letter command (obvious enough) and a points attribute containing
 *	the array of points.  Might come in handy for certain shorthand commands
 */
var shapeCommand = function(shape, command, lastCommand, offset) {

	// Each command begins with a letter.  Analyze the letter to
	// understand the command.  While you're at it, get the points too.
	let letter = command.match(/([a-zA-Z])((.)*)/);
	let points = letter[2].match(/\-?(\d+\.?\d*|\d*\.\d+)/g);

	// Now for the fun
	switch(letter[1]) {

		case ("a"):
			arcCommand(shape, points, offset, true);
			break;
		case ("A"):
			arcCommand(shape, points, offset, false);
			break;

		case ("c"):
			curveCommand(shape, points, offset, true);
			break;
		case ("C"):
			curveCommand(shape, points, offset, false);
			break;

		case ("h"):
			// Relative horizontal line.
			if (points.length == 1) {
				shape.lineTo(
					shape.currentPoint.x + parseFloat(points[0]),
					shape.currentPoint.y
				);
			}
			break;
		case ("H"):
			// Horizontal line.  Use line to again, and just pass in
			// currentPoint.y as second arg
			if (points.length == 1) {
				shape.lineTo(
					parseFloat(points[0]) - offset.x,
					shape.currentPoint.y
				);
			}
			break;

		case ("L"):
			// Line to
			lineCommand(shape, points, offset, false);
			break;
		case ("l"):
			lineCommand(shape, points, offset, true);
			break;

		case ("M"):
			// Move to command.
			moveCommand(shape, points, offset, false);
			break;
		case ("m"):
			moveCommand(shape, points, offset, true);
			break;

		case ("Q"):
			quadraticCommand(shape, points, offset, false);
			break;
		case ("q"):
			quadraticCommand(shape, points, offset, true);
			break;

		// Not sure if it's short for S-curve, or shape, or smooth.  Regardless,
		// it's basically a special type of mirrored C command.
		case ("s"):
			scurvyCommand(shape, points, lastCommand, offset, true);
			break;
		case ("S"):
			scurvyCommand(shape, points, lastCommand, offset, false);
			break;

		// T-curves?
		case ("t"):
		case ("T"):

		case ("V"):
			// Vertical line.  See horizontal line.
			if (points.length == 1) {
				shape.lineTo(
					shape.currentPoint.x,
					offset.y - parseFloat(points[0])
				);
			}
			break;
		case ("v"):
			// Relative vertical line
			if (points.length == 1) {
				shape.lineTo(
					shape.currentPoint.x,
					shape.currentPoint.y - parseFloat(points[0])
				);
			}
			break;

		case ("Z"):
		case ("z"):
			shape.lineTo(shape.firstPoint.x, shape.firstPoint.y);
			break;
	}

	if (shape.firstPoint === undefined) {
		shape.firstPoint = Object.assign({}, shape.currentPoint);
	}
	return { letter: letter[1], points };
}

/**
 * Used to handle S commands.  Because I'm not entirely sure what the S stands
 * for, but since I know it's related to the C command, and because I'm an insufferable
 * little shit, I named this function as such.
 * @param shape
 * @param points
 * @param lastPoints
 * @param offset
 * @param relative
 */
var scurvyCommand = function(shape, points, lastCommand, offset, relative) {

	console.log(lastCommand);

	// Right then, so let's determine what the first control points should be.
	let firstPoint = {x: 0, y: 0};
	if (lastCommand.letter == "S" || lastCommand.letter == "s" ||
			lastCommand.letter == "C" || lastCommand.letter == "c" ) {
		// The more straightforward case.  We're doing a mirror of the last control
		// point used
		firstPoint.x = parseFloat(lastCommand.points[2]) * -1;
		firstPoint.y = parseFloat(lastCommand.points[3]) * -1;
	} else {
		// Otherwise, the first point would be basically the currentPoint in shape
		if (!relative) {
			firstPoint.x = shape.currentPoint.x;
			firstPoint.y = shape.currentPoint.y;
		}
	}

	// From here it's basically a curve command.
	if (relative) {
		shape.bezierCurveTo(
			shape.currentPoint.x + firstPoint.x,
			shape.currentPoint.y - firstPoint.y,
			shape.currentPoint.x + parseFloat(points[0]),
			shape.currentPoint.y - parseFloat(points[1]),
			shape.currentPoint.x + parseFloat(points[2]),
			shape.currentPoint.y - parseFloat(points[3])
		);
		return;
	}

	shape.bezierCurveTo(
		firstPoint.x - offset.x,
		offset.y - firstPoint.y,
		parseFloat(points[1]) - offset.x,
		offset.y - parseFloat(points[2]),
		parseFloat(points[3]) - offset.x,
		offset.y - parseFloat(points[4])
	);
}
