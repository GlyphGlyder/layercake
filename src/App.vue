<template>
  <div id="app">

    <div id="THREEContainer">
    </div>

    <div class="container form-container" v-if="!parsed">
      <form v-on:submit.prevent="parseSVG">

  			<textarea class="form-control" type="file" id="UploadPictures"
          rows="12" placeholder="Paste raw data here" v-model="svgRaw"></textarea>
        <br/>
        <button type="submit">Submit</button>

  		</form>
    </div>

  </div>
</template>

<script>
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
      this.buildBoxes(rects);

      // Then the polygons
      this.buildPolygons(polygons);

      this.parsed = true;
    },

    render: function() {
      requestAnimationFrame( this.render );
      this.object.rotation.y += 0.005;
      this.renderer.render(this.scene, this.camera);
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
    this.camera.position.z = 150;
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

.form-container {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  form {
    display: block;
    width: 100%;
  }
}

</style>
