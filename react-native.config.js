module.exports = {
  dependencies: {
    leap: {
      root: __dirname + '/android/leap',
      platforms: {
        android: {
          sourceDir: './android/leap',
          packageImportPath: 'import ai.liquid.leap.rn.RNLeapPackage;',
          packageInstance: 'new RNLeapPackage()'
        }
      }
    }
  }
};
