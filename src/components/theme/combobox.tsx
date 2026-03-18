import { useLingui } from "@lingui/react";
import { useRouter } from "@tanstack/react-router";

import { isTheme, setThemeServerFn, themeMap } from "@/utils/theme";

import { Combobox, type SingleComboboxProps } from "../ui/combobox";
import { useTheme } from "./provider";

type Props = Omit<SingleComboboxProps, "options" | "value" | "onValueChange">;

export function ThemeCombobox(props: Props) {
  const router = useRouter();
  const { i18n } = useLingui();
  const { theme, setTheme } = useTheme();

  const options = Object.entries(themeMap).map(([value, label]) => ({
    value,
    label: i18n.t(label),
    keywords: [i18n.t(label)],
  }));

  const onThemeChange = async (value: string | null) => {
    if (!value || !isTheme(value)) return;
    await setThemeServerFn({ data: value });
    setTheme(value);
    void router.invalidate();
  };

  return <Combobox {...props} showClear={false} options={options} defaultValue={theme} onValueChange={onThemeChange} />;
}
