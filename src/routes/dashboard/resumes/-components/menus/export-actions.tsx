import type { PropsWithChildren, ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { CircleNotchIcon } from "@phosphor-icons/react";

import type { RouterOutput } from "@/integrations/orpc/client";

import {
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useResumeExport } from "@/hooks/use-resume-export";
type Resume = RouterOutput["resume"]["list"][number];

type ExportActionItemProps = {
  label: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

export function ResumeDropdownExportActions({ resume }: { resume: Resume }) {
  const { downloadJSON, downloadDOCX, downloadPDF, isPending } = useResumeExport({ resume });

  return (
    <>
      <DropdownMenuSeparator />

      <DropdownMenuGroup>
        <DropdownMenuLabel>
          <Trans>Export</Trans>
        </DropdownMenuLabel>

        <ExportDropdownItem
          disabled={isPending.json}
          onClick={() => void downloadJSON()}
          label={<Trans>Download JSON</Trans>}
        />

        <ExportDropdownItem
          disabled={isPending.docx}
          onClick={() => void downloadDOCX()}
          label={<Trans>Download DOCX</Trans>}
        />

        <ExportDropdownItem
          disabled={isPending.pdf}
          onClick={() => void downloadPDF()}
          label={<Trans>Download PDF</Trans>}
        >
          {isPending.pdf && <CircleNotchIcon className="size-4 animate-spin" />}
        </ExportDropdownItem>
      </DropdownMenuGroup>
    </>
  );
}

export function ResumeContextExportActions({ resume }: { resume: Resume }) {
  const { downloadJSON, downloadDOCX, downloadPDF, isPending } = useResumeExport({ resume });

  return (
    <>
      <ContextMenuSeparator />

      <ContextMenuGroup>
        <ContextMenuLabel>
          <Trans>Export</Trans>
        </ContextMenuLabel>

        <ExportContextItem
          disabled={isPending.json}
          onClick={() => void downloadJSON()}
          label={<Trans>Download JSON</Trans>}
        />

        <ExportContextItem
          disabled={isPending.docx}
          onClick={() => void downloadDOCX()}
          label={<Trans>Download DOCX</Trans>}
        />

        <ExportContextItem
          disabled={isPending.pdf}
          onClick={() => void downloadPDF()}
          label={<Trans>Download PDF</Trans>}
        >
          {isPending.pdf && <CircleNotchIcon className="size-4 animate-spin" />}
        </ExportContextItem>
      </ContextMenuGroup>
    </>
  );
}

function ExportDropdownItem({ label, disabled, onClick, children }: PropsWithChildren<ExportActionItemProps>) {
  return (
    <DropdownMenuItem disabled={disabled} onClick={onClick}>
      {children}
      {label}
    </DropdownMenuItem>
  );
}

function ExportContextItem({ label, disabled, onClick, children }: PropsWithChildren<ExportActionItemProps>) {
  return (
    <ContextMenuItem disabled={disabled} onClick={onClick}>
      {children}
      {label}
    </ContextMenuItem>
  );
}
