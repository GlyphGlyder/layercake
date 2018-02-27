<template>
  <div id="app">

    <div class="btn-container" v-if="!svg">

      <button class="btn btn-default">
        Upload SVG
      </button>

    </div>

  </div>
</template>

<script>
export default {
  name: 'app',
  data: function() {
    return {
      svg: false
    }
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

.btn-container {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

</style>
