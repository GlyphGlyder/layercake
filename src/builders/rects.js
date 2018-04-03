/**
 * Bulk of the code for taking SVG rects and turning them into threejs boxes
 * * * * */

export default {

	make: function(rects, offset) {

		var meshes = [];

		for(var i = 0; i < rects.length; i ++) {

			let x = 0;
			let y = 0;
			let height = 0;
			let width = 0;
			let color = "#000000"

			// Okay, so let's get the width
			let widthMatch = rects[i].match(/width="(\d+(\.\d+)?)"/);
			if (widthMatch != null && widthMatch.length > 2) {
				// Capture
				width = parseFloat(widthMatch[1]);
			}

			// Then the height
			let heightMatch = rects[i].match(/height="(\d+(\.\d+)?)"/);
			if (heightMatch != null && heightMatch.length > 2) {
				// Capture
				height = parseFloat(heightMatch[1]);
			}

			// Then the x position
			let xMatch = rects[i].match(/x="(\d+(\.\d+)?)"/);
			if (xMatch != null && xMatch.length > 2) {
				x = parseFloat(xMatch[1]) - offset.x + (width / 2);
			} else {
				x = 0 - offset.x + (width / 2);
			}

			// Followed by the y position
			let yMatch = rects[i].match(/y="(\d+(\.\d+)?)"/);
			if (yMatch != null && yMatch.length > 2) {
				y = offset.y - parseFloat(yMatch[1]) - height / 2;
			}

			// Finally, there may be a color associated with it.  Let's grab that
			// too
			let colorMatch = rects[i].match(/style="(.)*fill:(#[a-f0-9]{0,6})(.)*"/i);
			if (colorMatch != null && colorMatch.length > 3) {
				// Capture, going to be the second capture group
				color = colorMatch[2];
			}

			// Now let's use this information to create a new box
			let box = new THREE.BoxGeometry(width, height, 5);
			let material = new THREE.MeshBasicMaterial( {color} );
			let mesh = new THREE.Mesh(box, material);
			mesh.position.x = x;
			mesh.position.y = y;
			mesh.position.z = 2.5;

			meshes.push(mesh);
		}

		return meshes;

	}

}
