<template>
  <div id="app">

    <div id="THREEContainer">
    </div>

    <div class="container form-container" v-if="!parsed">

      <img src="assets/layercake.svg" style="max-width: 33%; max-height: 20%"/>
      <h1>Layercake</h1>
      <p class="lead">Put your SVGs in the oven, receive freshly-baked 3D models.</p>

      <form v-on:submit.prevent="parseSVG">

  			<textarea class="form-control" type="file" id="UploadPictures"
          rows="12" placeholder="Paste raw data here" v-model="svgRaw"></textarea>
        <br/>
        <button type="submit">Submit</button>

  		</form>

    </div>

    <button class="btn btn-default save-button" v-if="parsed" v-on:click="save">
      Save
    </button>

  </div>
</template>

<script>
import { saveAs } from 'file-saver';
import * as ObjExporter from '@glyphglyder/obj-exporter';
import helpers from './helpers';
export default {
  name: 'app',
  data: function() {
    return {

      scene: '',
      camera: '',
      renderer: '',

      svgRaw: "",
      parsed: false,
      object: {},
      objects: [],
      originOffset: {
        x: 0,
        y: 0,
      }
    }
  },

  methods: {

    buildBoxes: function(rects) {

      // The rects will be easiest.  For each one we'll create a BoxGeometry
      // and use the provided width and height specifications along with the provided fill (if there is one)
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
          x = parseFloat(xMatch[1]) - this.originOffset.x + (width / 2);
        } else {
          x = 0 - this.originOffset.x + (width / 2);
        }

        // Followed by the y position
        let yMatch = rects[i].match(/y="(\d+(\.\d+)?)"/);
        if (yMatch != null && yMatch.length > 2) {
          y = this.originOffset.y - parseFloat(yMatch[1]) - height / 2;
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
        this.objects.push(mesh);

        this.object.add(mesh);
      }
    },

    buildCircles: function(circles) {

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

        console.log(x + ", " + y + ", " + r);

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
          parseFloat(x) - this.originOffset.x,
          this.originOffset.y - parseFloat(y) + r
        );
        shape.absarc(
          parseFloat(x) - this.originOffset.x,
          this.originOffset.y - parseFloat(y),
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

        this.objects.push(mesh);
        this.object.add(mesh);
      }

    },

    buildPaths: function(paths) {

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
        console.log(pathData);

        // Then, we're going to grab every single substring that begins with
        // a letter and contains an unlimited number of digits and commas.
        // The delimiter for every path command is going to be a letter
        let pathCommands = pathData.match(pathCommandRegex);
        console.log(pathCommands)

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
            helpers.shapeCommand(currentTarget, pathCommands[j], this.originOffset);
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
        console.log(translateMatch);

        this.objects.push(mesh);
        this.object.add(mesh);
      }

    },

    buildPolygons: function(polygons) {

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
                parseFloat(pointStrings[j]) - this.originOffset.x,
                this.originOffset.y - parseFloat(pointStrings[j + 1])
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
          this.objects.push(mesh);
          this.object.add(mesh);

        }

      }

    },

    /**
     * When the user posts some raw svg data it goes through and attempts to
     * convert every bit into a 3D object.
     */
    parseSVG: function() {

      // At the moment we construct everything using circles, rects, polygons, and paths
      var rects;
      var circles;
      var polygons;
      var paths;

      const rectRegExp = /<rect (.*)\/>/g;
      const circleRegExp = /<circle (.*)\/>/g;
      const polygonRegExp = /<polygon (.*)\/>/g;
      const pathRegExp = /<path (.*)\/>/g;
      const viewBoxRegExp = /viewBox="0 0 (\d+(\.\d+)?) (\d+(\.\d+)?)"/

      // First, let's get all the rects
      rects = this.svgRaw.match(rectRegExp);

      // Then the circles
      circles = this.svgRaw.match(circleRegExp);

      // Then the polygons
      polygons = this.svgRaw.match(polygonRegExp);

      // And finally, the paths
      paths = this.svgRaw.match(pathRegExp);

      // Now, before we start adding shit we need to calculate the origin offset
      // we can do that by getting the viewbox
      let viewBox = this.svgRaw.match(viewBoxRegExp);
      if (viewBox.length >= 5) {
        let x = viewBox[1];
        let y = viewBox[3];
        this.originOffset.x = x / 2;
        this.originOffset.y = y / 2;
      }

      // Put together the box geos first
      if (rects != null) {
        this.buildBoxes(rects);
      }

      // Then the circles
      if (circles != null) {
        this.buildCircles(circles);
      }

      // Then the polygons
      if (polygons != null) {
        this.buildPolygons(polygons);
      }

      // And finally, the tricky paths
      if (paths != null) {
        this.buildPaths(paths);
      }

      this.parsed = true;
    },

    render: function() {
      requestAnimationFrame( this.render );
      this.object.rotation.y += 0.005;
      this.renderer.render(this.scene, this.camera);
    },

    save: function() {
      const buffer = ObjExporter.meshes(this.objects).then(function(blob) {
        saveAs(blob, 'svg-to-three.zip');
      });
    }

  },

  mounted: function() {

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      $("#THREEContainer").width() /
      $("#THREEContainer").height(),
      0.1,
      1000
    );

    //this.camera.position.x = 150;
    //this.camera.position.y = 150;
    this.camera.position.z = 200;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setSize(
      $("#THREEContainer").width(),
      $("#THREEContainer").height()
    );

    this.renderer.setClearColor(0xFFFFFF);
    document.getElementById("THREEContainer").appendChild( this.renderer.domElement );

    var ambientLight = new THREE.AmbientLight(0xA0A0A0);
    this.scene.add(ambientLight);

    var directLight = new THREE.DirectionalLight(0xFFFFFF, 0.37);
    directLight.position.set(1, 1, 1);
    this.scene.add(directLight);

    this.object = new THREE.Object3D();
    this.scene.add(this.object);

    this.render();
  }
}
</script>

<style lang="scss">

body, html {
  height: 100%;
  margin: 0;
}

#app {
  height: 100%;
}

#THREEContainer {
  position: absolute;
  top: 0;
  bottom: 0;
  height: 100%;
  width: 100%;
  z-index: -100;
}

.save-button {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 100;
}

.form-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  & > * {
    margin: 20px auto;
  }

  form {
    display: block;
    width: 100%;
  }
}

</style>
