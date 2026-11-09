const STORE_SHOT_ROUTES = new Set(['/stats', '/status', '/weekly-recap', '/data-export', '/goal-edit', '/my-foods', '/search', '/settings']);

export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  // 開発ビルドだけ hachibu://dev/... を /dev へ通す (Simulator から simctl openurl で開くため)
  if (__DEV__) {
    const devPath = path.replace(/^[a-z]+:\/\//, '/').replace(/^\/+/, '/');
    if (devPath === '/dev' || devPath.startsWith('/dev/')) return devPath;
    // ストア用スクリーンショットの撮影用: 主な画面も simctl openurl で直接開ける (開発ビルドだけ。本番は全てホームへ戻す)
    if (STORE_SHOT_ROUTES.has(devPath)) return devPath;
  }
  return '/';
}
