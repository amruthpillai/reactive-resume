import { useMemo } from "react";

import { CommandGroup } from "@/components/ui/command";

import { useCommandPaletteStore } from "../store";

type Props = {
  page?: string;
  heading: React.ReactNode;
  children: React.ReactNode;
};

export const BaseCommandGroup = ({ page, heading, children }: Props) => {
  const pages = useCommandPaletteStore((state) => state.pages);
  const currentPage = pages[pages.length - 1];

  const isEnabled = useMemo(() => {
    return currentPage === page;
  }, [currentPage, page]);

  if (!isEnabled) return null;

  return <CommandGroup heading={heading}>{children}</CommandGroup>;
};
