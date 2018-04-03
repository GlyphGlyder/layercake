/**
 * Collection of reusable helper functions stored here.  Makes the main Vue
 * component much less noisey
 * * * * */

import circles from './circles';
import paths from './paths';
import polygons from './polygons';
import rects from './rects';

export default {

	makeCircles: circles.make,

	makePaths: paths.make,

	makePolygons: polygons.meshes,

	makeRects: rects.make,

}
