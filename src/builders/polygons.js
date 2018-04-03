/**
 * Contains the bulk of the actual code that converts svg polygon elements into
 * a threejs shape.
 * * * * */

export default {

	/**
	 * Takes an array of polygon elements (at least, that's what the regexp logic
	 * thinks they are) and converts them into three.js meshes.
	 * @param polygons: An array of strings, specially strings that make for a
	 *	valid SVG polygon.
	 * @param offset: The x,y coordinates needed to position the polygons relative
	 *	to the center.
	 * @return: an array of threejs meshes.
	 */
	meshes: function(polygons, offset) {

		var meshes = [];

		for(var i = 0; i < polygons.length; i ++) {

			// Polygons are defined by an indefinite set of x,y pairs.  So, let's
			// use some regexp to pull them out
			let pointRegExp = /points="((\s*(\d+(\.\d+)?) (\d+(\.\d+)?)\s*)+)"/
			let pointMatch = polygons[i].match(pointRegExp);
			if (pointMatch.length > 2) {

				// Seperate each point
				let pointStrings = pointMatch[1].split(' ');

				// Convert them into an array of Vector2s
				let points = [];
				for(var j = 0; j < pointStrings.length; j +=2) {
					points.push(
						new THREE.Vector2(
							parseFloat(pointStrings[j]) - offset.x,
							offset.y - parseFloat(pointStrings[j + 1])
						)
					);
				}

				// Finally, there may be a color associated with it.  Let's grab that
				// too
				let color = "#000000";
				let colorMatch = polygons[i].match(/style="(.)*fill:(#[a-f0-9]{0,6})(.)*"/i);
				if (colorMatch != null && colorMatch.length > 3) {
					// Capture, going to be the second capture group
					color = colorMatch[2];
				}

				// Now create the shape and turn the whole thing into a mesh
				let shape = new THREE.Shape(points);
				let geometry = new THREE.ExtrudeGeometry(shape, {
					amount: 5,
					bevelSize: 0,
					bevelThickness: 0
				});
				let material = new THREE.MeshBasicMaterial({color});
				let mesh = new THREE.Mesh(geometry, material);
				meshes.push(mesh);

			}

		}

		return meshes;

	}
}
