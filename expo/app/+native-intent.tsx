export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  // 開発ビルドだけ hachibu://dev/... を /dev へ通す (Simulator から simctl openurl で開くため)
  if (__DEV__) {
    const devPath = path.replace(/^[a-z]+:\/\//, '/').replace(/^\/+/, '/');
    if (devPath === '/dev' || devPath.startsWith('/dev/')) return devPath;
  }
  return '/';
}
