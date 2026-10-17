/**
 * Custom Expo config plugin: Pods の iOS デプロイメントターゲット下限を引き上げる
 *
 * Sentry (11.0) / RevenueCat (13.0) / SDWebImage (9.0) など一部の Pod は
 * podspec で古いデプロイメントターゲットを宣言している。Xcode 26 までは警告だったが、
 * Xcode 27 では「サポート範囲 (15.0〜) 外」がビルドエラーになり、ローカルビルドが通らない。
 *
 * Podfile の post_install 末尾で、下限未満の Pod ターゲットだけを MIN_TARGET に揃える。
 * アプリ本体のターゲット (Expo 既定 15.1) は変えない。
 */

const { withPodfile } = require('@expo/config-plugins');

const MIN_TARGET = '15.1';
const MARKER = '# [ios-pods-deployment-target] raise pods below minimum';

const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${MIN_TARGET}')
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_TARGET}'
        end
      end
    end
`;

module.exports = function withIosPodsDeploymentTarget(config) {
  return withPodfile(config, (cfg) => {
    const podfile = cfg.modResults.contents;
    if (podfile.includes(MARKER)) return cfg;

    // react_native_post_install(...) 呼び出しの直後に挿入する
    const anchor = /(react_native_post_install\([\s\S]*?\n\s*\))/;
    if (!anchor.test(podfile)) {
      throw new Error('[ios-pods-deployment-target] react_native_post_install not found in Podfile');
    }
    cfg.modResults.contents = podfile.replace(anchor, `$1\n${SNIPPET}`);
    return cfg;
  });
};
