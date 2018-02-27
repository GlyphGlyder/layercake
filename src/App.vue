<template>
  <div id="app">

    <div class="container form-container" v-if="!parsed">
      <form v-on:submit.prevent="parseSVG">

  			<textarea class="form-control" type="file" id="UploadPictures"
          rows="12" placeholder="Paste raw data here" v-model="svgRaw"></textarea>
        <br/>
        <button type="submit">Submit</button>

  		</form>
    </div>

    <div v-else id="THREEContainer">
    </div>

  </div>
</template>

<script>
export default {
  name: 'app',
  data: function() {
    return {
      svgRaw: "",
      parsed: false,
      objects: []
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
          x = parseFloat(xMatch[1]);
        }

        // Followed by the y position
        let yMatch = rects[i].match(/y="(\d+(\.\d+)?)"/);
        if (yMatch != null && yMatch.length > 2) {
          y = parseFloat(yMatch[1]);
        }

        // Finally, there may be a color associated with it.  Let's grab that
        // too
        let colorMatch = rects[i].match(/style="(.)*fill:(#[a-e0-9]{0,6})(.)*"/i)
        if (colorMatch != null && colorMatch.length > 3) {
          // Capture, going to be the second capture group
          color = colorMatch[2];
        }

        // Now let's use this information to create a new box
        let box = new THREE.BoxGeometry(width, height, 5);
        let material = new THREE.MeshBasicMaterial( {color} );
        let mesh = new THREE.Mesh(box, material);
        this.objects.push(mesh);
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

      // First, let's get all the rects
      rects = this.svgRaw.match(rectRegExp);

      // Then the circles
      circles = this.svgRaw.match(circleRegExp);

      // Then the polygons
      polygons = this.svgRaw.match(polygonRegExp);

      // And finally, the paths
      paths = this.svgRaw.match(pathRegExp);

      // Put together the box geos first
      this.buildBoxes(rects);
    }

  },

  mounted: function() {

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
  height: 100%;
  width: 100%;
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
