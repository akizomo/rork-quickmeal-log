import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  /** Below 16px, use compact (7-dot) variant — the faded 8th dot disappears at small sizes. */
  compact?: boolean;
};

/**
 * Hachibu logo mark.
 * 3×3 grid, bottom-right cell removed, bottom-middle cell at 20% opacity.
 * The faded 8th dot is the brand thesis (80% on a 9-cell grid is impossible).
 */
export function Logo({ size = 48, color = '#1A1916', compact }: Props) {
  const useCompact = compact ?? size < 16;
  const cell = size / 4;
  const dotR = cell * 0.32;
  const cells: { row: number; col: number; opacity: number }[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 2 && col === 2) continue;
      if (row === 2 && col === 1 && useCompact) continue;
      const opacity = row === 2 && col === 1 ? 0.2 : 1;
      cells.push({ row, col, opacity });
    }
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {cells.map(({ row, col, opacity }, i) => (
          <Circle
            key={i}
            cx={col * cell + cell + cell / 2}
            cy={row * cell + cell + cell / 2}
            r={dotR}
            fill={color}
            opacity={opacity}
          />
        ))}
      </Svg>
    </View>
  );
}
