/**
 * Collection of reusable helper functions stored here.  Makes the main Vue
 * component much less noisey
 * * * * */

export default {

	/**
	 * Takes some SVG path command string, breaks it down, then uses a switch to
	 * figure out what to do next.
	 */
	shapeCommand: function(shape, command, offset) {

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
				var laf = parseInt(points[3]);
				var sf = parseInt(points[4]);

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

				var x1 = Math.cos( xAngle ) * ( x - nx ) / 2 + Math.sin( xAngle ) * ( y - ny ) / 2;
				var y1 = - Math.sin( xAngle ) * ( x - nx ) / 2 + Math.cos( xAngle ) * ( y - ny ) / 2;

				// Fuck this shit
				// https://en.wikipedia.org/wiki/Norm_(mathematics)
				var norm = Math.sqrt( ( radiusX * radiusX * radiusY * radiusY - radiusX * radiusX * y1 * y1 - radiusY * radiusY * x1 * x1 ) /
								 ( radiusX * radiusX * y1 * y1 + radiusY * radiusY * x1 * x1 ) );

				// This was causing some weird bullshit.  Getting rid of it.
				// Mind you, this code is half a decade old.
				//if ( laf === sf ) norm = - norm;

				var x2 = norm * radiusX * y1 / radiusY;
				var y2 = norm * -radiusY * x1 / radiusX;

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
		}
	}
}
