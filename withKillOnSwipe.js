const { withMainActivity } = require('@expo/config-plugins');

module.exports = function withKillOnSwipe(config) {
  return withMainActivity(config, async (config) => {
    const content = config.modResults.contents;
    if (!content.includes('killProcess')) {
      const killCode = `
    override fun onDestroy() {
        super.onDestroy()
        android.os.Process.killProcess(android.os.Process.myPid())
    }
`;
      config.modResults.contents = content.replace(
        'class MainActivity : ReactActivity() {',
        'class MainActivity : ReactActivity() {\n' + killCode
      );
    }
    return config;
  });
};
