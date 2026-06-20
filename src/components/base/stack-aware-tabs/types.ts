import type { SharedValue } from "react-native-reanimated";

interface Icon {
  readonly focused: boolean;
  readonly color: string;
  readonly size: number;
}

type IconFN = (props: Icon) => React.ReactNode;

interface TabBarProps {
  readonly onPress: () => void;
  readonly onLongPress: () => void;
  readonly isFocused: Required<boolean>;
  readonly label: Required<string>;
  readonly icon?: IconFN;
  readonly index?: number;
  readonly activeIndex?: SharedValue<number>;
}

export { TabBarProps };
