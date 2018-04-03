/**
 * Contains the bulk of the code used for taking svg path elements and converting
 * them into a 3D object.
 */

export default {

	make: function(paths, offset) {

		let meshes = [];
		// This is the formula for a path command.  Every path begins with a
		// letter, followed by at least one positive or negative digit which may
		// or may not have a decimal.  In some instances there's more than one
		// "point", in which case additional numbers may follow after a comma,
		// space, or negative sign as their seperator.
		let pathCommandRegex = /([a-zA-Z](\-?\d+(\.\d+)?(([\s\,\-])*\d+(\.\d+)?)*)?)/g;

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
			for(var j = 0; j < pathCommands.length; j ++) {

				if (pathCommands[j] == "Z" || pathCommands == "z") {
					// Okay, this is tricky.  Basically though, a Z in the middle
					// indicates we're cutting holes in the path.  If currentTarget
					// == shape, then we simply assign a new Path object to
					// currentTarget.  Otherwise, we're going to add currentTarget to
					// shape's "holes" and add yet another path
					if (currentTarget !== shape) {
						shape.holes.push(currentTarget);
					}
					currentTarget = new THREE.Path();
					currentTarget.moveTo(shape.currentPoint.x, shape.currentPoint.y);

				} else {
					shapeCommand(currentTarget, pathCommands[j], offset);
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

			meshes.push(mesh);
		}

		return meshes;

	}

}

/**
 * Takes some SVG path command string, breaks it down, then uses a switch to
 * figure out what to do next.
 * @param shape: a threejs shape or threejs path object.  Depending on what
 *	the particular path command is, this function will call a method on this
 *	object to gradually built it into some sort of shape.
 * @param command: the particular command snippet taken from the full path
 *	string
 * @param offset: an x,y coordinate pair, necessary since svg shapes are
 *	positioned relative to the top left whereas threejs uses a scene graph.
 */
var shapeCommand = function(shape, command, offset) {

	// Each command begins with a letter.  Analyze the letter to
	// understand the command.  While you're at it, get the points too.
	let letter = command.match(/([a-zA-Z])((.)*)/);
	let points = letter[2].match(/\-?\d+\.?\d*/g);

	// Now for the fun
	switch(letter[1]) {
		case ("M"):
			// Move to command.
			if (points.length == 2) {
				shape.moveTo(
					parseFloat(points[0]) - offset.x,
					offset.y - parseFloat(points[1])
				);
			}
			break;
		case ("m"):
			// Relative move to.  We can use currentPoint to figure it out.
			// IMPORTANT!: A relative increase in the Y in an SVG viewport is
			// always interpreted as moving DOWN.  Easy fix is to simply subtract.
			if (points.length == 2) {
				shape.moveTo(
					shape.currentPoint.x + parseFloat(points[0]),
					shape.currentPoint.y - parseFloat(points[1])
				);
			}
			break;
		case ("L"):
			// Line to
			if (points.length == 2) {
				shape.lineTo(
					parseFloat(points[0]) - offset.x,
					offset.y - parseFloat(points[1])
				);
			}
			break;
		case ("l"):
			// Relative line to.  Again, use current point.
			if (points.length == 2) {
				shape.lineTo(
					shape.currentPoint.x + parseFloat(points[0]),
					shape.currentPoint.y - parseFloat(points[1])
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
		case ("h"):
			// Relative horizontal line.
			if (points.length == 1) {
				shape.lineTo(
					shape.currentPoint.x + parseFloat(points[0]),
					shape.currentPoint.y
				);
			}
			break;
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
		case ("a"):
		case ("A"):
			// An arc command.  Shape has arc and absolute arc commands. but
			// they require slightly different args.  Using some other asshole's
			// code
			// https://github.com/mrdoob/three.js/blob/master/examples/webgl_geometry_extrude_shapes2.html
			var radiusX = parseFloat(points[0]);
			var radiusY = parseFloat(points[1]);
			var xAngle = parseFloat(points[2]);
			var laf = (parseInt(points[3]) === 1);
			var sf = (parseInt(points[4]) === 1);

			console.log(laf);
			console.log(sf);

			let nx = 0;
			let ny = 0;
			if (letter[1] == "a") {
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
			break;
		case ("Z"):
		case ("z"):
			shape.lineTo(shape.firstPoint.x, shape.firstPoint.y);
			break;
	}

	if (shape.firstPoint === undefined) {
		shape.firstPoint = Object.assign({}, shape.currentPoint);
	} else if (letter[1] == "Z" || letter [1] == "z") {
		shape.firstPoint = undefined;
	}
}
