/**
 * Contains the bulk of the actual code used to convert SVG circles into
 * three.js shapes (they would be circles, but you can't extrude circle geos,
 * pitty)
 * * * * */

export default {

	/**
	 * Function that creates three.js meshes given some svg circle elements.
	 * @param circles
	 * @param offset
	 * @return an array of threejs meshes.
	 */
	make: function(circles, offset) {

		var meshes = [];

		// Regular expressions for grabbing the x, y, and radius respectively
		let xRegExp = /cx="(\d+(\.\d+)?)"/
		let yRegExp = /cy="(\d+(\.\d+)?)"/
		let rRegExp = /r="(\d+(\.\d+)?)"/

		for(var i = 0; i < circles.length; i ++) {

			let x = 0;
			let y = 0;
			let r = 0;
			let color = "#FF0000";

			// Circles are the simplest of the bunch.  We're going to need to get
			// the cx and cy to derive their x and y position
			let xMatch = circles[i].match(xRegExp);
			if (xMatch.length > 2) {
				x = xMatch[1];
			}

			let yMatch = circles[i].match(yRegExp);
			if (yMatch.length > 2) {
				y = yMatch[1];
			}

			// Next, we're going to grab their radius.  Simple enough
			let rMatch = circles[i].match(rRegExp);
			if (rMatch.length > 2) {
				r = rMatch[1];
			}

			// Oh, and don't forget the color
			let colorMatch = circles[i].match(/style="(.)*fill:(#[a-f0-9]{0,6})(.)*"/i);
			if (colorMatch != null && colorMatch.length > 3) {
				// Capture, going to be the second capture group
				color = colorMatch[2];
			}

			// Okay, we have all we need.  So, let's try building the circle.
			// We're not going to use a simple CircleGeometry.  Instead, we'll need
			// to use an ExtrudeGeometry along with a shape drawn as a circle
			// (i.e. one big ass arc)
			let shape = new THREE.Shape();
			shape.moveTo(
				parseFloat(x) - offset.x,
				offset.y - parseFloat(y) + r
			);
			shape.absarc(
				parseFloat(x) - offset.x,
				offset.y - parseFloat(y),
				r,
				0,
				0,
			);

			let geometry = new THREE.ExtrudeGeometry(shape, {
				amount: 5,
				bevelSize: 0,
				bevelThickness: 0
			});
			let material = new THREE.MeshBasicMaterial({color});
			let mesh = new THREE.Mesh(geometry, material);

			meshes.push(mesh);

		}

		return meshes;

	}
}
