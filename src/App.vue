<template>
  <div id="app" style="height: 100%">

    <!-- Actual 3D model goes here.  Does nothing until after the SVG is parsed.
      Even so, we keep it around -->
    <div id="THREEContainer">
    </div>

    <!-- Pre-parsed content.  It's just the logo, a witty bit of microcopy,
      and a form to copy/paste the raw SVG data -->
    <div style="height: 100%;" v-if="!parsed">

      <div class="container above-fold" >

        <img src="assets/layercake.svg" style="max-width: 200px;"/>
        <h1>Layercake</h1>
        <p class="lead">Put your SVGs in the oven, bake some delicious 3D models.</p>

        <div class="row">
          <div class="col">
            <a href="#SVGPaste" class="btn btn-primary">Paste in SVG content</a>
          </div>
        </div>
      </div>

      <div class="container svg-paste" id="SVGPaste">

        <p class="lead">Paste in <strong>all</strong> of the SVG data</p>
        <form v-on:submit.prevent="parseSVG">

    			<textarea class="form-control" type="file" id="UploadPictures"
            rows="12" placeholder="Paste raw data here" v-model="svgRaw"></textarea>
          <br/>
          <button type="submit" class="btn btn-primary">Go</button>

    		</form>

      </div>

    </div>

    <!-- Post-parsed content.  For now it's just a button -->
    <div class="post-parsed " v-if="parsed">
      <button class="btn btn-default" v-on:click="save">
        Save
      </button>

      <button class="btn btn-danger" v-if="parsed" v-on:click="undo">Undo</button>
    </div>

  </div>
</template>

<script>
import { saveAs } from 'file-saver';
import * as ObjExporter from '@glyphglyder/obj-exporter';
import builders from './builders';
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

    /**
     * When the user posts some raw svg data it goes through and attempts to
     * convert every bit into a 3D object.
     */
    parseSVG: function() {

      var meshes = [];

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
      const groupRegExp = /<g[^>]*>((?!<\/g>)\s|(?!<\/g>).)*<\/g>/g;

      // Now, before we start adding shit we need to calculate the origin offset
      // we can do that by getting the viewbox
      let viewBox = this.svgRaw.match(viewBoxRegExp);
      if (viewBox.length >= 5) {
        let x = viewBox[1];
        let y = viewBox[3];
        this.originOffset.x = x / 2;
        this.originOffset.y = y / 2;
      }

      // Next, let's group together all the elements by whatever <g> element
      // they fall into
      let groups = this.svgRaw.match(groupRegExp);
      if (groups != null) {
        let _this = this;
        groups.forEach(function(group, index) {

          // First, let's get all the rects
          rects = group.match(rectRegExp);

          // Then the circles
          circles = group.match(circleRegExp);

          // Then the polygons
          polygons = group.match(polygonRegExp);

          // And finally, the paths
          paths = group.match(pathRegExp);

          // Alright the, now let's build our boxes
          if (rects != null) {
            meshes = meshes.concat(builders.makeRects(rects, _this.originOffset, index, groups.length));
          }

          // Then our circles
          if (circles != null) {
            meshes = meshes.concat(builders.makeCircles(circles, _this.originOffset, index, groups.length));
          }

          // Then our polygons
          if (polygons != null) {
            meshes = meshes.concat(builders.makePolygons(polygons, _this.originOffset, index, groups.length));
          }

          // And finally, those damned tricky paths
          if (paths != null) {
            meshes = meshes.concat(builders.makePaths(paths, _this.originOffset, index, groups.length));
          }

        });
      } else {

        // First, let's get all the rects
        rects = this.svgRaw.match(rectRegExp);

        // Then the circles
        circles = this.svgRaw.match(circleRegExp);

        // Then the polygons
        polygons = this.svgRaw.match(polygonRegExp);

        // And finally, the paths
        paths = this.svgRaw.match(pathRegExp);

        // Alright the, now let's build our boxes
        if (rects != null) {
          meshes = builders.makeRects(rects, this.originOffset);
        }

        // Then our circles
        if (circles != null) {
          meshes = meshes.concat(builders.makeCircles(circles, this.originOffset));
        }

        // Then our polygons
        if (polygons != null) {
          meshes = meshes.concat(builders.makePolygons(polygons, this.originOffset));
        }

        // And finally, those damned tricky paths
        if (paths != null) {
          meshes = meshes.concat(builders.makePaths(paths, this.originOffset));
        }

      }

      // Now let's take all of our meshes and assign them to our array of
      // objects.  Let's also add them, one by one, to the "prime object"
      this.objects = meshes;
      var _this = this;
      meshes.forEach(function(mesh) {
        _this.object.add(mesh);
      });

      // We can now finally flip the parsed flag, which will nix the form and
      // the logo and show the threejs scene beneath.
      this.parsed = true;
    },

    render: function() {
      requestAnimationFrame( this.render );
      this.object.rotation.y += 0.005;
      this.renderer.render(this.scene, this.camera);
    },

    /**
     * Takes the model and saves it as a zip containing a .mtl and .obj file.
     */
    save: function() {
      const buffer = ObjExporter.meshes(this.objects).then(function(blob) {
        saveAs(blob, 'svg-to-three.zip');
      });
    },

    undo: function() {
      this.objects = [];
      this.scene.remove(this.object);
      this.object = new THREE.Object3D();
      this.scene.add(this.object);
      this.svgRaw = '';
      this.parsed = false;
    }

  },

  /**
   * Creates a three.js scene with an empty object.  It's not actually populated
   * until after an SVG is parsed.
   */
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
  font-family: 'Nunito', sans-serif;
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

.post-parsed {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 100;
}

.above-fold, .svg-paste {
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
